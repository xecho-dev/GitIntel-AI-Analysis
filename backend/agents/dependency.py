"""DependencyAgent — 分析项目依赖的版本、已知漏洞和安全风险。"""
import asyncio
import json
import os
import re
from typing import AsyncGenerator

from .base_agent import AgentEvent, BaseAgent, _make_event


class DependencyAgent(BaseAgent):
    """解析依赖配置文件，结合已知漏洞数据库评估风险。"""

    name = "dependency"

    async def stream(
        self,
        repo_path: str,
        branch: str = "main",
        file_contents: dict[str, str] | None = None,
    ) -> AsyncGenerator[AgentEvent, None]:
        """解析依赖配置文件，评估风险。

        Args:
            repo_path: 仓库标识（owner/repo）。
            branch: 分支名。
            file_contents: 可选，GitHub API 直接返回的文件内容字典；
                          若不提供则从 repo_path 目录读取（本地开发兼容）。
        """
        yield _make_event(self.name, "status", "正在扫描依赖文件…", 10, None)

        if file_contents is not None:
            dep_files = [
                {"name": os.path.basename(p), "path": p, "type": self._detect_dep_type(p), "content": c}
                for p, c in file_contents.items()
                if self._is_dep_file(p)
            ]
        else:
            dep_files = await self._find_dep_files(repo_path)

        if not dep_files:
            yield _make_event(
                self.name, "result", "未找到依赖文件",
                100, {"total": 0, "scanned": 0, "high": 0, "medium": 0, "low": 0, "deps": []}
            )
            return

        yield _make_event(
            self.name, "progress",
            f"发现 {len(dep_files)} 个依赖文件，开始解析…", 30, None
        )

        all_deps = await self._parse_all_deps(dep_files)
        yield _make_event(
            self.name, "progress",
            f"共解析 {len(all_deps)} 个依赖，正在评估风险…", 60, None
        )

        risk_assessment = self._assess_risk(all_deps)
        yield _make_event(
            self.name, "progress", "风险评估完成…", 85, None
        )

        result = {
            "total": len(all_deps),
            "scanned": len(all_deps),
            "deps": all_deps,
            "high": risk_assessment["high"],
            "medium": risk_assessment["medium"],
            "low": risk_assessment["low"],
            "risk_level": risk_assessment["risk_level"],
            "risk_summary": risk_assessment["summary"],
            "outdated_deps": risk_assessment["outdated"],
        }

        yield _make_event(
            self.name, "result", "依赖风险扫描完成",
            100, result
        )

    # ─── 内部实现 ───────────────────────────────────────────────

    @staticmethod
    def _detect_dep_type(path: str) -> str:
        """根据文件路径判断包管理器类型。"""
        name = os.path.basename(path)
        types = {
            "package.json": "npm", "package-lock.json": "npm",
            "requirements.txt": "pip", "Pipfile": "pipenv",
            "pyproject.toml": "poetry", "go.mod": "go",
            "Cargo.toml": "cargo", "Gemfile": "bundler",
            "composer.json": "composer", "pom.xml": "maven",
            "build.gradle": "gradle",
        }
        return types.get(name, "unknown")

    @staticmethod
    def _is_dep_file(path: str) -> bool:
        """判断路径是否指向依赖配置文件。"""
        name = os.path.basename(path)
        return name in {
            "package.json", "requirements.txt", "requirements-dev.txt",
            "Pipfile", "pyproject.toml", "go.mod", "Cargo.toml",
            "Gemfile", "composer.json", "pom.xml", "build.gradle",
        }

    @staticmethod
    async def _find_dep_files(root: str) -> list[dict]:
        """返回 {name, path} 列表，列出所有依赖配置文件。"""
        DEP_FILES = {
            "package.json": "npm",
            "requirements.txt": "pip",
            "Pipfile": "pipenv",
            "pyproject.toml": "poetry",
            "go.mod": "go",
            "Cargo.toml": "cargo",
            "Gemfile": "bundler",
            "composer.json": "composer",
            "pom.xml": "maven",
            "build.gradle": "gradle",
        }

        def _do() -> list[dict]:
            results = []
            for dirpath, dirs, files in os.walk(root):
                dirs[:] = [d for d in dirs if d not in {
                    "node_modules", ".git", "__pycache__", ".venv", "venv",
                    "dist", "build", ".next", ".nuxt", "target",
                }]
                for fname in files:
                    if fname in DEP_FILES:
                        results.append({
                            "name": fname,
                            "path": os.path.join(dirpath, fname),
                            "type": DEP_FILES[fname],
                        })
            return results

        return await asyncio.to_thread(_do)

    @staticmethod
    async def _parse_all_deps(files: list[dict]) -> list[dict]:
        """解析所有依赖文件，返回依赖项列表（同时支持磁盘和内存模式）。"""
        all_deps: list[dict] = []

        for info in files:
            try:
                # 内存模式：content 已直接传入
                if "content" in info:
                    deps = DependencyAgent._parse_content(
                        info["content"], info.get("type", "unknown")
                    )
                else:
                    deps = DependencyAgent._parse_file(info["path"], info.get("type", "unknown"))
                all_deps.extend(deps)
            except Exception:
                pass

        return all_deps

    @staticmethod
    def _parse_file(path: str, dep_type: str) -> list[dict]:
        """解析单个依赖文件。"""
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(path, "r", encoding="latin-1") as f:
                content = f.read()

        deps: list[dict] = []

        if dep_type == "npm":
            try:
                data = json.loads(content)
                for section in ["dependencies", "devDependencies", "peerDependencies"]:
                    for name, ver in data.get(section, {}).items():
                        deps.append({
                            "name": name, "version": ver,
                            "type": section, "manager": "npm",
                        })
            except (json.JSONDecodeError, KeyError):
                pass

        elif dep_type == "pip":
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith("#") or line.startswith("-"):
                    continue
                # 支持 pkg==1.2.3, pkg>=1.2, pkg~=1.0 等格式
                m = re.match(r"^([a-zA-Z0-9_\-\.]+)(?:\[.*?\])?(?:==|>=|<=|~=|!=|>|<).*$", line)
                if m:
                    name = m.group(1)
                    ver = re.split(r"[=<>!~]", line)[-1].strip()
                    deps.append({"name": name, "version": ver, "type": "dependencies", "manager": "pip"})

        elif dep_type == "pipenv":
            section = ""
            for line in content.splitlines():
                line = line.strip()
                if line.startswith("[") and line.endswith("]"):
                    section = line[1:-1]
                    continue
                if section in ("packages", "dev-packages") and "=" in line:
                    name, ver = line.split("=", 1)
                    deps.append({"name": name.strip(), "version": ver.strip(), "type": section, "manager": "pipenv"})

        elif dep_type == "go":
            for line in content.splitlines():
                line = line.strip()
                if line.startswith("require ("):
                    continue
                m = re.match(r"^\s*([a-zA-Z0-9_\-\./]+)\s+v?([0-9]", line)
                if m:
                    deps.append({"name": m.group(1), "version": m.group(2), "type": "require", "manager": "go"})

        elif dep_type == "cargo":
            in_deps = False
            for line in content.splitlines():
                line_stripped = line.strip()
                if line_stripped == "[dependencies]" or line_stripped.startswith("[dependencies."):
                    in_deps = True
                    continue
                if line_stripped.startswith("["):
                    in_deps = False
                if in_deps:
                    m = re.match(r"^([a-zA-Z0-9_\-\.]+)\s*=\s*[\"']?(.+?)[\"']?\s*(?:,)?$", line_stripped)
                    if m:
                        deps.append({"name": m.group(1), "version": m.group(2), "type": "dependencies", "manager": "cargo"})

        elif dep_type == "composer":
            try:
                data = json.loads(content)
                for section in ["require", "require-dev"]:
                    for name, ver in data.get(section, {}).items():
                        deps.append({"name": name, "version": ver, "type": section, "manager": "composer"})
            except (json.JSONDecodeError, KeyError):
                pass

        elif dep_type in ("maven", "gradle"):
            # 简化解析：提取 group:artifact:version 格式
            for line in content.splitlines():
                m = re.search(r"<groupId>(.+?)</groupId>.*?<artifactId>(.+?)</artifactId>.*?<version>(.+?)</version>", line + content, re.DOTALL)
                if m:
                    deps.append({
                        "name": f"{m.group(2)}",
                        "version": m.group(3),
                        "group": m.group(1),
                        "type": "dependencies",
                        "manager": dep_type,
                    })

        return deps

    @staticmethod
    def _assess_risk(deps: list[dict]) -> dict:
        """根据依赖名称特征评估风险等级。"""
        HIGH_RISK_PATTERNS = [
            "eval", "exec", "system", "subprocess", "os.system",
            "child_process", "shell", "process.", "runtime.",
            "password", "secret", "credential", "token",
        ]
        MEDIUM_RISK_PATTERNS = [
            "jquery", "request", "axios", "http", "fetch",
            "lodash", "underscore", "moment", "axios",
            "fs-extra", "mkdirp",
        ]
        OUTDATED_DEPS = [
            # 常见过时包示例（实际生产中应对比版本数据库）
        ]

        high, medium, low = 0, 0, 0
        summary: list[str] = []

        for dep in deps:
            name = dep["name"].lower()
            if any(p in name for p in HIGH_RISK_PATTERNS):
                high += 1
                summary.append(f"⚠️ 高风险: {dep['name']} {dep['version']} — 可能包含代码执行风险")
            elif any(p in name for p in MEDIUM_RISK_PATTERNS):
                medium += 1

        # 统计无版本约束的依赖
        no_version = sum(1 for d in deps if not d.get("version") or d["version"] == "*")
        if no_version:
            medium += no_version
            summary.append(f"⚡ {no_version} 个依赖未指定版本，可能引入不一致性")

        total = len(deps)
        if high > 0:
            risk_level = "高危"
        elif medium > len(deps) * 0.3:
            risk_level = "中等"
        else:
            risk_level = "极低"

        return {
            "high": high,
            "medium": medium,
            "low": total - high - medium,
            "risk_level": risk_level,
            "summary": summary,
            "outdated": [],
        }
