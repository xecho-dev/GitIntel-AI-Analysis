"""
SharedState — LangGraph 工作流中所有 Agent 共享的状态结构。
"""
from typing import Optional

from typing_extensions import TypedDict


class SharedState(TypedDict, total=False):
    # ─── 入口参数 ─────────────────────────────────────────────
    repo_url: str
    branch: str
    auth_user_id: Optional[str]

    # ─── Stage 1: 仓库加载 ─────────────────────────────────────
    local_path: Optional[str]
    file_contents: dict[str, str]
    repo_loader_result: Optional[dict]
    # RepoLoader 多轮决策中间状态（支持 LangGraph checkpoint 断点续传）
    repo_tree: Optional[list[dict]]         # GitHub API 返回的原始文件树
    repo_sha: Optional[str]                # 当前 commit SHA
    classified_files: Optional[list[dict]]  # 分类后的文件列表（含 priority）
    loaded_files: dict[str, str]            # 已加载的文件内容
    pending_files: list[dict]               # 待加载的文件（LLM 决策后填充）
    llm_decision_rounds: int                # LLM 决策轮次
    llm_decision_history: list[dict]        # 历次 LLM 决策记录

    # ─── Stage 2: 代码结构解析 ─────────────────────────────────
    code_parser_result: Optional[dict]  # {total_files, total_functions, total_classes, language_stats, largest_files}

    # ─── Stage 3: 技术栈识别 ───────────────────────────────────
    tech_stack_result: Optional[dict]  # {languages, frameworks, infrastructure, dev_tools, package_manager, ...}

    # ─── Stage 4: 代码质量分析 ─────────────────────────────────
    quality_result: Optional[dict]  # {health_score, test_coverage, complexity, maintainability, python_metrics, typescript_metrics, ...}

    # ─── Stage 5: 优化建议生成 ─────────────────────────────────
    suggestion_result: Optional[dict]  # {suggestions, total, high_priority, medium_priority, low_priority}

    # ─── 最终聚合结果 ───────────────────────────────────────────
    final_result: Optional[dict]  # 全部结果打包，供前端展示

    # ─── 错误与元数据 ───────────────────────────────────────────
    errors: list[str]
    finished_agents: list[str]  # 已完成的 agent 名称列表
