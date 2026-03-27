from abc import ABC, abstractmethod
from typing import AsyncGenerator, TypedDict


class AgentEvent(TypedDict):
    type: str       # "status" | "progress" | "result" | "error"
    agent: str      # agent name
    message: str | None
    percent: int | None
    data: dict | None


def _make_event(
    agent: str,
    type_: str,
    message: str,
    percent: int,
    data: dict | None = None,
) -> AgentEvent:
    return AgentEvent(
        type=type_, agent=agent, message=message, percent=percent, data=data
    )


class BaseAgent(ABC):
    """所有 Agent 的基类，定义统一接口。"""

    name: str

    @abstractmethod
    async def stream(
        self, repo_path: str, branch: str = "main"
    ) -> AsyncGenerator[AgentEvent, None]:
        """流式输出事件（SSE 用）。

        Args:
            repo_path: 已在本地 checked-out 的仓库路径（由 RepoLoaderAgent 准备）。
            branch: 分支名（仅作参考，代码已在 repo_path 中）。
        """
        ...

    async def run(
        self,
        repo_path: str,
        branch: str = "main",
        file_contents: dict[str, str] | None = None,
    ) -> dict:
        """执行 Agent，收集并返回最终 result 数据。

        子类（如 SuggestionAgent）可以传递额外的 keyword arguments 给 stream()。
        """
        result = None
        async for event in self.stream(repo_path, branch, file_contents=file_contents):
            if event["type"] == "result":
                result = event["data"]
        return result or {}

    # ─── 通用工具方法 ────────────────────────────────────────────

    @staticmethod
    async def _walk_files(
        root: str,
        extensions: list[str] | None = None,
        max_files: int = 2000,
        ignore_dirs: frozenset[str] = frozenset({
            "node_modules", ".git", "__pycache__", ".venv", "venv",
            "dist", "build", ".next", ".nuxt", "target", "site",
            ".pytest_cache", ".mypy_cache", ".ruff_cache",
        }),
    ) -> list[str]:
        """异步遍历目录，返回符合扩展名的文件路径列表。

        Args:
            root: 仓库根目录。
            extensions: 目标文件扩展名，如 [".py", ".ts"]，None 表示全部。
            max_files: 最大文件数量，防止超大仓库撑爆内存。
            ignore_dirs: 忽略的目录名集合。
        """
        import os
        collected: list[str] = []

        async def _walk_recursive(current: str):
            if len(collected) >= max_files:
                return
            try:
                entries = os.listdir(current)
            except OSError:
                return
            for name in entries:
                if name in ignore_dirs or name.startswith("."):
                    continue
                path = os.path.join(current, name)
                if os.path.isdir(path):
                    await _walk_recursive(path)
                    if len(collected) >= max_files:
                        return
                elif os.path.isfile(path):
                    if extensions is None or any(path.endswith(ext) for ext in extensions):
                        collected.append(path)

        import asyncio
        await asyncio.to_thread(_walk_recursive, root)
        return collected

    @staticmethod
    def _calc_complexity(score: float) -> str:
        """根据综合得分返回复杂度描述。"""
        if score >= 80:
            return "Low"
        elif score >= 50:
            return "Medium"
        return "High"

    @staticmethod
    def _calc_maintainability(score: float) -> str:
        """根据综合得分返回可维护性等级。"""
        if score >= 85:
            return "A+"
        elif score >= 75:
            return "A"
        elif score >= 65:
            return "B+"
        elif score >= 55:
            return "B"
        elif score >= 40:
            return "C"
        return "C-"
