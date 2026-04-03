"""GitHub PR Service — 通过 GitHub API 创建分支、提交代码、创建 PR。

完整流程：
  1. 解析仓库 URL 获取 owner/repo
  2. 获取默认分支（base）
  3. 创建新分支（head）
  4. 获取 base 分支的最新 commit SHA
  5. 提交文件修改（一个或多个文件）
  6. 创建 Pull Request
"""
import base64
import logging
import os
import re
from dataclasses import dataclass
from typing import Any

import httpx

logger = logging.getLogger("gitintel")


@dataclass
class PRResult:
    """PR 创建结果。"""
    success: bool
    pr_url: str = ""
    pr_number: int = 0
    pr_title: str = ""
    error: str = ""


@dataclass
class DiffResult:
    """单个文件的 Diff 结果。"""
    file: str
    type: str  # replace | insert | delete
    original: str
    updated: str
    diff_content: str  # unified diff 格式


def _parse_github_url(url: str) -> tuple[str, str]:
    """解析 GitHub URL 获取 owner 和 repo。"""
    # 清理 URL
    url = re.sub(r"\.git$", "", url)
    url = url.rstrip("/")

    # 支持格式：
    # https://github.com/owner/repo
    # git@github.com:owner/repo.git
    m = re.match(r"https?://github\.com/([^/]+)/([^/.]+)", url)
    if m:
        return m.group(1), m.group(2)

    m = re.match(r"git@github\.com:([^/]+)/([^/]+)", url)
    if m:
        return m.group(1), m.group(2)

    raise ValueError(f"无法解析 GitHub URL: {url}")


def _generate_branch_name(fixes: list[dict]) -> str:
    """根据修复内容生成分支名。"""
    # 基于第一个修复的类型生成描述性分支名
    if fixes:
        first_fix = fixes[0]
        fix_type = first_fix.get("type", "fix")
        file_hint = first_fix.get("file", "code").split("/")[-1].split(".")[0]
        return f"gitintel/auto-{fix_type}-{file_hint}"
    return "gitintel/auto-fix"


class GitHubPRService:
    """GitHub PR 创建服务。"""

    def __init__(self, token: str | None = None):
        self.token = token or os.getenv("GITHUB_TOKEN", "").strip()
        if not self.token:
            raise ValueError("需要设置 GITHUB_TOKEN 环境变量")
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def create_pr(
        self,
        repo_url: str,
        branch: str,
        fixes: list[dict],
        base_branch: str | None = None,
        pr_title: str | None = None,
        pr_body: str | None = None,
    ) -> PRResult:
        """创建 Pull Request。

        Args:
            repo_url: GitHub 仓库 URL
            branch: 被分析的源分支
            fixes: 代码修改方案列表
            base_branch: PR 的目标分支（默认使用仓库默认分支）
            pr_title: PR 标题
            pr_body: PR 描述
        """
        try:
            owner, repo = _parse_github_url(repo_url)

            # 1. 获取仓库默认分支
            if not base_branch:
                default_branch = await self._get_default_branch(owner, repo)
                base_branch = default_branch
            else:
                default_branch = base_branch

            # 2. 获取 base 分支的最新 commit SHA
            base_sha = await self._get_branch_sha(owner, repo, base_branch)

            # 3. 生成新分支名
            new_branch = _generate_branch_name(fixes)

            # 4. 创建新分支（基于 base_branch）
            await self._create_branch(owner, repo, new_branch, base_sha)

            # 5. 提交文件修改
            for fix in fixes:
                await self._commit_file(
                    owner, repo, new_branch, fix
                )

            # 6. 创建 PR
            pr = await self._create_pull_request(
                owner, repo,
                head=new_branch,
                base=base_branch,
                title=pr_title or f"GitIntel Auto: {fixes[0].get('reason', 'Code improvements')[:50]}" if fixes else "GitIntel Auto Fix",
                body=pr_body or self._build_pr_body(fixes),
            )

            return PRResult(
                success=True,
                pr_url=pr.get("html_url", ""),
                pr_number=pr.get("number", 0),
                pr_title=pr.get("title", ""),
            )

        except Exception as exc:
            logger.error(f"[GitHubPRService] 创建 PR 失败: {exc}")
            error_msg = str(exc)
            # 提供更友好的错误提示
            if "403" in error_msg:
                if "repo" in error_msg.lower() or "ref" in error_msg.lower():
                    error_msg = (
                        "GitHub Token 权限不足。需要创建具有 'repo' 范围的 Personal Access Token：\n"
                        "1. 访问 https://github.com/settings/tokens\n"
                        "2. 创建新 Token，勾选 'repo' 权限\n"
                        "3. 更新 GITHUB_TOKEN 环境变量"
                    )
            return PRResult(success=False, error=error_msg)

    async def get_file_content(
        self, owner: str, repo: str, filepath: str, branch: str
    ) -> str | None:
        """从 GitHub API 获取文件原始内容（UTF-8）。

        Returns:
            文件内容字符串，文件不存在时返回 None。
        """
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.get(
                    f"{self.base_url}/repos/{owner}/{repo}/contents/{filepath}",
                    headers=self.headers,
                    params={"ref": branch},
                )
                if resp.status_code == 404:
                    return None
                resp.raise_for_status()
                data = resp.json()
                # GitHub API 返回 base64 编码内容
                content_b64 = data.get("content", "")
                # 去掉可能的换行
                content_b64 = content_b64.replace("\n", "")
                try:
                    decoded = base64.b64decode(content_b64).decode("utf-8")
                    return decoded
                except Exception:
                    return None
            except Exception:
                return None

    async def _get_default_branch(self, owner: str, repo: str) -> str:
        """获取仓库默认分支。"""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.base_url}/repos/{owner}/{repo}",
                headers=self.headers,
            )
            if resp.status_code == 404:
                raise ValueError(f"仓库不存在: {owner}/{repo}")
            resp.raise_for_status()
            return resp.json().get("default_branch", "main")

    async def _get_branch_sha(self, owner: str, repo: str, branch: str) -> str:
        """获取分支的最新 commit SHA。"""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.base_url}/repos/{owner}/{repo}/branches/{branch}",
                headers=self.headers,
            )
            if resp.status_code == 404:
                raise ValueError(f"分支不存在: {branch}")
            resp.raise_for_status()
            return resp.json()["commit"]["sha"]

    async def _create_branch(self, owner: str, repo: str, branch: str, sha: str) -> None:
        """创建新分支。"""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base_url}/repos/{owner}/{repo}/git/refs",
                headers=self.headers,
                json={
                    "ref": f"refs/heads/{branch}",
                    "sha": sha,
                },
            )
            # 如果分支已存在（409），忽略
            if resp.status_code == 422:
                # 分支已存在，检查 SHA 是否一致
                existing = await self._get_branch_sha(owner, repo, branch)
                if existing != sha:
                    # 需要更新 ref（先删除再创建）
                    await client.delete(
                        f"{self.base_url}/repos/{owner}/{repo}/git/refs/heads/{branch}",
                        headers=self.headers,
                    )
                    await client.post(
                        f"{self.base_url}/repos/{owner}/{repo}/git/refs",
                        headers=self.headers,
                        json={
                            "ref": f"refs/heads/{branch}",
                            "sha": sha,
                        },
                    )
            elif resp.status_code not in (200, 201):
                resp.raise_for_status()

    async def _commit_file(
        self,
        owner: str,
        repo: str,
        branch: str,
        fix: dict,
    ) -> None:
        """提交单个文件修改。"""
        filepath = fix.get("file", "")
        fix_type = fix.get("type", "replace")
        original = fix.get("original", "")
        updated = fix.get("updated", "")

        # 生成 diff 内容
        diff_content = self._generate_diff(filepath, original, updated, fix_type)

        # 获取文件的当前 SHA（如果存在）
        file_sha = None
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                resp = await client.get(
                    f"{self.base_url}/repos/{owner}/{repo}/contents/{filepath}",
                    headers=self.headers,
                    params={"ref": branch},
                )
                if resp.status_code == 200:
                    file_sha = resp.json().get("sha")
            except Exception:
                pass

            # 构建提交内容
            if fix_type == "delete":
                # 删除文件
                content_b64 = ""
            else:
                content_b64 = base64.b64encode(updated.encode("utf-8")).decode("utf-8")

            commit_data: dict[str, Any] = {
                "message": fix.get("reason", "Auto fix by GitIntel")[:72],
                "content": content_b64,
                "branch": branch,
            }
            if file_sha:
                commit_data["sha"] = file_sha

            resp = await client.put(
                f"{self.base_url}/repos/{owner}/{repo}/contents/{filepath}",
                headers=self.headers,
                json=commit_data,
            )
            resp.raise_for_status()

    def _generate_diff(
        self,
        filepath: str,
        original: str,
        updated: str,
        fix_type: str,
    ) -> str:
        """生成 unified diff 格式。"""
        if fix_type == "delete":
            return f"""---
 {filepath}
---

```diff
- {original}
```"""
        elif fix_type == "insert":
            return f"""---
 {filepath}
---

```diff
+ {updated}
```"""
        else:  # replace
            return f"""---
 {filepath}
---

```diff
- {original}
+ {updated}
```"""

    def _build_pr_body(self, fixes: list[dict]) -> str:
        """构建 PR 描述。"""
        lines = [
            "## 🤖 GitIntel 自动修复",
            "",
            "基于代码分析自动生成的修改建议：",
            "",
        ]

        for i, fix in enumerate(fixes[:10], 1):
            lines.append(f"### {i}. `{fix.get('file', '')}`")
            lines.append(f"**类型**: {fix.get('type', 'replace')}")
            if fix.get("reason"):
                lines.append(f"**原因**: {fix['reason']}")
            if fix.get("original") and fix.get("updated"):
                lines.append("```diff")
                lines.append(f"- {fix['original'][:100]}")
                lines.append(f"+ {fix['updated'][:100]}")
                lines.append("```")
            lines.append("")

        lines.extend([
            "---",
            "*此 PR 由 GitIntel 自动生成*",
        ])

        return "\n".join(lines)

    async def _create_pull_request(
        self,
        owner: str,
        repo: str,
        head: str,
        base: str,
        title: str,
        body: str,
    ) -> dict:
        """创建 Pull Request。"""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base_url}/repos/{owner}/{repo}/pulls",
                headers=self.headers,
                json={
                    "head": head,
                    "base": base,
                    "title": title,
                    "body": body,
                    "maintainer_can_modify": True,
                },
            )
            resp.raise_for_status()
            return resp.json()
