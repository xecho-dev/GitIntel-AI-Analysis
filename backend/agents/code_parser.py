"""CodeParserAgent — 使用 tree-sitter 对仓库进行 AST 分析，提取结构化代码信息。"""
import asyncio
import os
from collections import defaultdict
from typing import AsyncGenerator

from .base_agent import AgentEvent, BaseAgent, _make_event


_EXT_TO_LANG: dict[str, str] = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".swift": "swift",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".scala": "scala",
    ".php": "php",
    ".zig": "zig",
    ".dart": "dart",
}


def _load_ts_parser(language: str):
    """懒加载 tree-sitter 语言解析器。"""
    try:
        from tree_sitter_languages import get_parser
        return get_parser(language)
    except ImportError:
        return None


class CodeParserAgent(BaseAgent):
    """遍历仓库源码文件，执行 AST 解析，提取结构化指标。"""

    name = "code_parser"

    async def stream(
        self,
        repo_path: str,
        branch: str = "main",
        file_contents: dict[str, str] | None = None,
    ) -> AsyncGenerator[AgentEvent, None]:
        """对仓库执行 AST 分析，yield 进度事件。

        Args:
            repo_path: 仓库标识（owner/repo）。
            branch: 分支名（仅参考）。
            file_contents: 可选，GitHub API 直接返回的文件内容字典；
                           若不提供则从 repo_path 目录读取（本地开发兼容）。
        """
        yield _make_event(
            self.name, "status",
            "正在扫描源码文件…", 10, None
        )

        files = await self._walk_source_files(repo_path)
        if not files:
            yield _make_event(
                self.name, "error",
                "未找到可分析的源码文件", 0, None
            )
            return

        yield _make_event(
            self.name, "progress",
            f"共扫描 {len(files)} 个文件，开始 AST 解析…", 30, None
        )

        if file_contents is not None:
            # ── GitHub API 模式：直接使用内存中的文件内容 ─────────────
            files = [
                {"path": path, "content": content}
                for path, content in file_contents.items()
            ]
            if not files:
                yield _make_event(self.name, "error", "未获取到任何文件内容", 0, None)
                return
            yield _make_event(
                self.name, "progress",
                f"共 {len(files)} 个文件，开始 AST 解析…", 30, None
            )
            try:
                stats = await self._analyze_inmemory_files(files)
            except Exception as exc:
                yield _make_event(
                    self.name, "error", f"AST 解析失败: {exc}", 0, {"exception": str(exc)}
                )
                return
        else:
            # ── 本地开发模式：从磁盘读取 ─────────────────────────────────
            files = await self._walk_source_files(repo_path)
            if not files:
                yield _make_event(self.name, "error", "未找到可分析的源码文件", 0, None)
                return
            yield _make_event(
                self.name, "progress",
                f"共扫描 {len(files)} 个文件，开始 AST 解析…", 30, None
            )
            try:
                stats = await self._analyze_files(files)
            except Exception as exc:
                yield _make_event(
                    self.name, "error", f"AST 解析失败: {exc}", 0, {"exception": str(exc)}
                )
                return

        yield _make_event(
            self.name, "progress",
            "AST 分析完成，正在聚合统计…", 80, None
        )

        yield _make_event(
            self.name, "result", "代码结构解析完成",
            100, stats
        )

    # ─── 内部实现 ───────────────────────────────────────────────

    @staticmethod
    async def _walk_source_files(root: str) -> list[str]:
        """返回所有可进行 AST 分析的源文件路径。"""
        IGNORE = frozenset({
            "node_modules", ".git", "__pycache__", ".venv", "venv",
            "dist", "build", ".next", ".nuxt", "target", ".pytest_cache",
            ".mypy_cache", ".ruff_cache", "site-packages",
        })

        def _do() -> list[str]:
            files: list[str] = []
            for dirpath, dirs, filenames in os.walk(root):
                dirs[:] = [d for d in dirs if d not in IGNORE and not d.startswith(".")]
                for fname in filenames:
                    ext = os.path.splitext(fname)[1]
                    if ext in _EXT_TO_LANG:
                        files.append(os.path.join(dirpath, fname))
            return files

        return await asyncio.to_thread(_do)

    @staticmethod
    async def _analyze_inmemory_files(files: list[dict]) -> dict:
        """批量分析内存中的文件内容，提取结构化指标（GitHub API 模式）。"""
        def _do() -> dict:
            lang_stats: dict[str, dict] = defaultdict(lambda: {
                "files": 0, "functions": 0, "classes": 0,
                "imports": 0, "total_lines": 0,
            })
            total_functions = 0
            total_classes = 0
            largest_files: list[dict] = []

            for item in files:
                fpath = item["path"]
                content = item["content"]
                ext = os.path.splitext(fpath)[1]
                lang = _EXT_TO_LANG.get(ext)
                if not lang:
                    continue

                try:
                    source = content.encode("utf-8", errors="replace")
                    lines = source.count(b"\n") + 1
                except Exception:
                    lines = 0

                functions, classes, imports = CodeParserAgent._parse_file(source, lang)
                total_functions += functions
                total_classes += classes

                lang_stats[lang]["files"] += 1
                lang_stats[lang]["functions"] += functions
                lang_stats[lang]["classes"] += classes
                lang_stats[lang]["imports"] += imports
                lang_stats[lang]["total_lines"] += lines

                if lines > 50:
                    largest_files.append({
                        "path": fpath.replace("\\", "/"),
                        "lines": lines,
                        "functions": functions,
                        "language": lang,
                    })

            largest_files.sort(key=lambda x: x["lines"], reverse=True)
            largest_files = largest_files[:10]

            return {
                "total_files": len(files),
                "total_functions": total_functions,
                "total_classes": total_classes,
                "language_stats": dict(lang_stats),
                "largest_files": largest_files,
            }

        return await asyncio.to_thread(_do)

    @staticmethod
    async def _analyze_files(files: list[str]) -> dict:
        """批量分析文件，提取结构化指标。"""
        def _do() -> dict:
            lang_stats: dict[str, dict] = defaultdict(lambda: {
                "files": 0, "functions": 0, "classes": 0,
                "imports": 0, "total_lines": 0,
            })
            total_functions = 0
            total_classes = 0
            largest_files: list[dict] = []

            for fpath in files:
                ext = os.path.splitext(fpath)[1]
                lang = _EXT_TO_LANG.get(ext)
                if not lang:
                    continue

                try:
                    with open(fpath, "rb") as f:
                        source = f.read()
                except OSError:
                    continue

                try:
                    lines = source.count(b"\n") + 1
                except Exception:
                    lines = 0

                functions, classes, imports = CodeParserAgent._parse_file(source, lang)
                total_functions += functions
                total_classes += classes

                lang_stats[lang]["files"] += 1
                lang_stats[lang]["functions"] += functions
                lang_stats[lang]["classes"] += classes
                lang_stats[lang]["imports"] += imports
                lang_stats[lang]["total_lines"] += lines

                if lines > 50:
                    largest_files.append({
                        "path": fpath.replace("\\", "/"),
                        "lines": lines,
                        "functions": functions,
                        "language": lang,
                    })

            # 按行数排序，取 TOP 10
            largest_files.sort(key=lambda x: x["lines"], reverse=True)
            largest_files = largest_files[:10]

            return {
                "total_files": len(files),
                "total_functions": total_functions,
                "total_classes": total_classes,
                "language_stats": dict(lang_stats),
                "largest_files": largest_files,
            }

        return await asyncio.to_thread(_do)

    @staticmethod
    def _parse_file(source: bytes, lang: str) -> tuple[int, int, int]:
        """使用 tree-sitter 解析单个文件，返回 (functions, classes, imports) 数量。"""
        parser = _load_ts_parser(lang)
        if parser is None:
            return 0, 0, 0

        try:
            tree = parser.parse(source)
        except Exception:
            return 0, 0, 0

        funcs = 0
        classes = 0
        imports = 0

        # ── 通用函数/类节点类型（跨语言） ──────────────────────
        FUNC_TYPES = {
            "function_declaration", "function_definition", "function",
            "method_declaration", "method_definition",
            "arrow_function", "lambda_expression",
        }
        CLASS_TYPES = {
            "class_declaration", "class_definition", "class",
            "struct_declaration", "interface_declaration",
        }
        IMPORT_TYPES = {
            "import_statement", "import_from_statement",
            "import_declaration", "require_call",
        }

        def walk(node):
            nonlocal funcs, classes, imports
            type_name = node.type

            if type_name in FUNC_TYPES:
                funcs += 1
            elif type_name in CLASS_TYPES:
                classes += 1
            elif type_name in IMPORT_TYPES:
                imports += 1

            for child in node.children:
                walk(child)

        walk(tree.root_node)
        return funcs, classes, imports
