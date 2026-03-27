"""
LangGraph 工作流 — 编排 GitIntel 分析 Pipeline。

Pipeline 拓扑（线性顺序）：

  ┌─────────────────┐
  │ RepoLoaderAgent  │  ← 入口，通过 GitHub API + 多轮 LLM 决策智能拉取代码
  └────────┬────────┘
           │ file_contents, classified_files, llm_decision_history
           ▼
  ┌─────────────────┐
  │ CodeParserAgent  │  ← AST 解析 + 代码结构提取
  └────────┬────────┘
           │ code_parser_result + file_contents
           ▼
  ┌─────────────────┐
  │  TechStackAgent  │  ← 技术栈识别
  └────────┬────────┘
           │ tech_stack_result + all previous results
           ▼
  ┌─────────────────┐
  │  QualityAgent    │  ← 代码质量评分
  └────────┬────────┘
           │ quality_result + all previous results
           ▼
  ┌─────────────────┐
  │ SuggestionAgent  │  ← 综合所有结果生成优化建议
  └────────┬────────┘
           ▼
        [完成] → SSE DONE

关键特性：
  - 多轮 LLM 决策：RepoLoader 调用 LangChain LLM 多次判断加载哪些文件
  - 线性顺序执行：每个 Agent 严格按顺序依赖前一个的结果
  - file_contents 透传：RepoLoader 的结果贯穿整个 Pipeline
  - SSE 流式输出：每个 Agent 执行时实时 yield 事件
  - Checkpointing：每个节点执行后自动保存状态，支持断点续传
  - 错误隔离：单个 Agent 失败不中断整个流程
"""
import asyncio
import json
from typing import Any, AsyncGenerator

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, END

from agents import (
    RepoLoaderAgent,
    CodeParserAgent,
    TechStackAgent,
    QualityAgent,
    SuggestionAgent,
)
from .state import SharedState


# ─── 全局 Checkpoint Saver（内存版，适合单实例；生产换 PostgreSQL） ───
_checkpointer = MemorySaver()


# ─── LangGraph 节点函数 ──────────────────────────────────────────────

def node_repo_loader(state: SharedState) -> dict:
    """RepoLoader：多轮 LLM 决策 + 分阶段加载仓库代码（通过 GitHub API）。"""
    agent = RepoLoaderAgent()
    repo_url = state.get("repo_url", "")
    branch = state.get("branch", "main")

    # 检查断点状态（是否已有中间结果可恢复）
    existing_tree = state.get("repo_tree")
    existing_sha = state.get("repo_sha")
    existing_classified = state.get("classified_files")
    existing_loaded = state.get("loaded_files", {})
    existing_rounds = state.get("llm_decision_rounds", 0)

    # 若有 checkpoint 恢复数据，跳过已完成的阶段
    if existing_tree and existing_sha:
        # 有断点数据——跳过 fetch tree，直接用已有状态
        tree_items = existing_tree
        sha = existing_sha
    else:
        # 完整执行 fetch tree
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            tree_items, sha = loop.run_until_complete(
                agent.phase_fetch_tree(*_parse_url(repo_url), branch)
            )
        finally:
            loop.close()

        if not sha or not tree_items:
            return {
                "errors": list(state.get("errors", [])) + [f"RepoLoaderAgent: 无法获取 {repo_url} 的文件树"],
            }

    # LLM 初始分类
    if existing_classified:
        classified = existing_classified
    else:
        loop2 = asyncio.new_event_loop()
        asyncio.set_event_loop(loop2)
        try:
            classified, _ = loop2.run_until_complete(
                agent.phase_llm_classify(*_parse_url(repo_url), tree_items)
            )
        finally:
            loop2.close()

    # 分批加载 P0 + P1
    p0_files = [f for f in classified if f["priority"] == 0]
    p1_files = [f for f in classified if f["priority"] == 1]
    p2_files = [f for f in classified if f["priority"] == 2]

    loaded = dict(existing_loaded)

    # 补全未加载的 P0
    loaded_p0_paths = {f["path"] for f in classified if f["priority"] == 0 and f["path"] in loaded}
    missing_p0 = [f for f in p0_files if f["path"] not in loaded_p0_paths]
    if missing_p0:
        loop3 = asyncio.new_event_loop()
        asyncio.set_event_loop(loop3)
        try:
            p0_contents = loop3.run_until_complete(
                agent.phase_load_priority(*_parse_url(repo_url), sha, missing_p0)
            )
        finally:
            loop3.close()
        loaded.update(p0_contents)

    # 补全未加载的 P1
    loaded_p1_paths = {f["path"] for f in classified if f["priority"] == 1 and f["path"] in loaded}
    missing_p1 = [f for f in p1_files if f["path"] not in loaded_p1_paths]
    if missing_p1:
        loop4 = asyncio.new_event_loop()
        asyncio.set_event_loop(loop4)
        try:
            p1_contents = loop4.run_until_complete(
                agent.phase_load_priority(*_parse_url(repo_url), sha, missing_p1)
            )
        finally:
            loop4.close()
        loaded.update(p1_contents)

    # LLM 迭代决策（最多 3 轮）
    pending_p2 = list(p2_files)
    decision_history: list[dict] = list(state.get("llm_decision_history", []))
    rounds = existing_rounds

    while pending_p2 and rounds < agent.MAX_DECISION_ROUNDS:
        rounds += 1
        loop5 = asyncio.new_event_loop()
        asyncio.set_event_loop(loop5)
        try:
            need_more, extra_paths = loop5.run_until_complete(
                agent.phase_llm_decision(
                    *_parse_url(repo_url), loaded, pending_p2, rounds
                )
            )
        finally:
            loop5.close()

        if not need_more or not extra_paths:
            break

        extra_items = [f for f in pending_p2 if f["path"] in set(extra_paths)]
        pending_p2 = [f for f in pending_p2 if f["path"] not in set(extra_paths)]

        loop6 = asyncio.new_event_loop()
        asyncio.set_event_loop(loop6)
        try:
            extra_contents = loop6.run_until_complete(
                agent.phase_load_priority(*_parse_url(repo_url), sha, extra_items)
            )
        finally:
            loop6.close()
        loaded.update(extra_contents)

        decision_history.append({
            "round": rounds,
            "need_more": need_more,
            "paths_requested": extra_paths[:30],
            "paths_loaded": list(extra_contents.keys()),
        })

    errors = list(state.get("errors", []))
    if not loaded:
        errors.append(f"RepoLoaderAgent: 仓库 {repo_url} 加载失败或无文件内容")

    return {
        "repo_tree": tree_items,
        "repo_sha": sha,
        "classified_files": classified,
        "loaded_files": loaded,
        "file_contents": loaded,
        "repo_loader_result": {
            "owner": _parse_url(repo_url)[0],
            "repo": _parse_url(repo_url)[1],
            "branch": branch,
            "sha": sha,
            "total_tree_files": len(tree_items),
            "total_loaded": len(loaded),
            "llm_decision_rounds": rounds,
            "llm_decision_history": decision_history,
        },
        "llm_decision_rounds": rounds,
        "llm_decision_history": decision_history,
        "errors": errors,
        "finished_agents": list(state.get("finished_agents", [])) + ["repo_loader"],
    }


def _parse_url(url: str) -> tuple[str, str] | None:
    import re
    m = re.match(r"https?://github\.com/([^/]+)/([^/.]+)", url)
    if m:
        return m.group(1), m.group(2)
    m = re.match(r"git@github\.com:([^/]+)/([^/]+?)(?:\.git)?$", url)
    if m:
        return m.group(1), m.group(2)
    m = re.match(r"^([^/]+)/([^/]+)$", url.strip())
    if m:
        return m.group(1), m.group(2)
    return None


def _has_loader_result(state: SharedState) -> bool:
    """判断 RepoLoader 是否成功执行并返回了文件内容。"""
    return bool(state.get("loaded_files") or state.get("file_contents"))


def _get_inputs(state: SharedState) -> tuple[str, str, dict]:
    """从 SharedState 中提取公共输入参数。"""
    # 优先使用 loaded_files（新版），其次使用 file_contents（兼容旧格式）
    file_contents = state.get("loaded_files") or state.get("file_contents") or {}
    local_path = state.get("local_path", "")
    if not local_path:
        rlr = state.get("repo_loader_result")
        if rlr:
            local_path = rlr.get("repo", "")
    branch = state.get("branch", "main")
    return local_path, branch, file_contents


def node_code_parser(state: SharedState) -> dict:
    """CodeParser：AST 解析，提取代码结构。"""
    if not _has_loader_result(state):
        return {"errors": list(state.get("errors", [])) + ["CodeParserAgent: 跳过（无 repo_loader 结果）"]}

    local_path, branch, file_contents = _get_inputs(state)
    errors = list(state.get("errors", []))

    agent = CodeParserAgent()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(
            agent.run(local_path, branch, file_contents=file_contents or None)
        )
    finally:
        loop.close()

    if not result:
        errors.append("CodeParserAgent: 执行返回空结果")

    return {
        "code_parser_result": result,
        "errors": errors,
        "finished_agents": list(state.get("finished_agents", [])) + ["code_parser"],
    }


def node_tech_stack(state: SharedState) -> dict:
    """TechStack：识别技术栈。"""
    if not _has_loader_result(state):
        return {"errors": list(state.get("errors", [])) + ["TechStackAgent: 跳过（无 repo_loader 结果）"]}

    local_path, branch, file_contents = _get_inputs(state)
    errors = list(state.get("errors", []))

    agent = TechStackAgent()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(
            agent.run(local_path, branch, file_contents=file_contents or None)
        )
    finally:
        loop.close()

    if not result:
        errors.append("TechStackAgent: 执行返回空结果")

    return {
        "tech_stack_result": result,
        "errors": errors,
        "finished_agents": list(state.get("finished_agents", [])) + ["tech_stack"],
    }


def node_quality(state: SharedState) -> dict:
    """Quality：代码质量评分。"""
    if not _has_loader_result(state):
        return {"errors": list(state.get("errors", [])) + ["QualityAgent: 跳过（无 repo_loader 结果）"]}

    local_path, branch, file_contents = _get_inputs(state)
    errors = list(state.get("errors", []))

    agent = QualityAgent()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(
            agent.run(local_path, branch, file_contents=file_contents or None)
        )
    finally:
        loop.close()

    if not result:
        errors.append("QualityAgent: 执行返回空结果")

    return {
        "quality_result": result,
        "errors": errors,
        "finished_agents": list(state.get("finished_agents", [])) + ["quality"],
    }


def node_suggestion(state: SharedState) -> dict:
    """Suggestion：综合所有前置结果，生成优化建议。"""
    if not _has_loader_result(state):
        return {"errors": list(state.get("errors", [])) + ["SuggestionAgent: 跳过（无前置结果）"]}

    local_path, branch, file_contents = _get_inputs(state)
    errors = list(state.get("errors", []))

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(
            SuggestionAgent().run(
                local_path,
                branch,
                code_parser_result=state.get("code_parser_result"),
                tech_stack_result=state.get("tech_stack_result"),
                quality_result=state.get("quality_result"),
                dependency_result=None,  # DependencyAgent 已从流水线移除
            )
        )
    finally:
        loop.close()

    # 聚合最终结果
    final_result = {
        "repo_loader": state.get("repo_loader_result"),
        "code_parser": state.get("code_parser_result"),
        "tech_stack": state.get("tech_stack_result"),
        "quality": state.get("quality_result"),
        "suggestion": result,
        "errors": errors,
    }

    return {
        "suggestion_result": result,
        "final_result": final_result,
        "errors": errors,
        "finished_agents": list(state.get("finished_agents", [])) + ["suggestion"],
    }


# ─── 错误处理节点 ─────────────────────────────────────────────────────

def node_error(state: SharedState) -> dict:
    """错误处理节点：记录错误但不中断流程。"""
    return {
        "errors": list(state.get("errors", [])) + ["Pipeline: 进入错误处理节点"],
    }


# ─── 条件路由函数 ─────────────────────────────────────────────────────

def route_after_repo_loader(state: SharedState) -> str:
    """RepoLoader 完成后，根据成功/失败决定下一步。"""
    if _has_loader_result(state):
        return "code_parser"
    return "error"


# ─── 构建 LangGraph ───────────────────────────────────────────────────

def _build_graph() -> StateGraph:
    """构建并编译带 checkpointing 的线性 LangGraph 工作流。"""
    graph = StateGraph(state_schema=SharedState)

    # ── 添加节点 ──────────────────────────────────────────────────
    graph.add_node("repo_loader", node_repo_loader)
    graph.add_node("code_parser", node_code_parser)
    graph.add_node("tech_stack", node_tech_stack)
    graph.add_node("quality", node_quality)
    graph.add_node("suggestion", node_suggestion)
    graph.add_node("error", node_error)

    # ── 入口 ──────────────────────────────────────────────────────
    graph.set_entry_point("repo_loader")

    # ── 线性顺序边 ───────────────────────────────────────────────
    graph.add_conditional_edges(
        "repo_loader",
        route_after_repo_loader,
        {
            "code_parser": "code_parser",
            "error": "error",
        },
    )
    graph.add_edge("code_parser", "tech_stack")
    graph.add_edge("tech_stack", "quality")
    graph.add_edge("quality", "suggestion")

    # ── 结束 ──────────────────────────────────────────────────────
    graph.add_edge("suggestion", END)
    graph.add_edge("error", END)

    return graph


_workflow = _build_graph().compile(
    checkpointer=_checkpointer,
)


# ─── SSE 流式接口 ─────────────────────────────────────────────────────

async def stream_analysis_sse(
    repo_url: str,
    branch: str = "main",
    thread_id: str | None = None,
) -> AsyncGenerator[str, None]:
    """运行线性 Pipeline，以 SSE 格式流式输出每个 Agent 的事件。

    Args:
        repo_url: GitHub 仓库 URL
        branch: 分支名（默认 main）
        thread_id: 可选的 thread ID，用于 checkpointing 恢复
    """
    config: dict[str, Any] = {
        "configurable": {
            "thread_id": thread_id or f"{repo_url}::{branch}",
        }
    }

    # ── Step 1: RepoLoader ────────────────────────────────────────
    loader = RepoLoaderAgent()
    file_contents: dict[str, str] = {}
    local_path = ""

    async for event in loader.stream(repo_url, branch):
        yield f"data: {json.dumps(event)}\n\n"
        if event["type"] == "result" and event.get("data"):
            file_contents = event["data"].get("file_contents", {})
            local_path = event["data"].get("repo", "")

    if not file_contents:
        yield f"data: {json.dumps({'type': 'error', 'agent': 'pipeline', 'message': '仓库加载失败，无法继续分析', 'percent': 0, 'data': None})}\n\n"
        yield "data: [DONE]\n\n"
        return

    # ── Step 2: CodeParser ────────────────────────────────────────
    code_parser_agent = CodeParserAgent()
    code_parser_result = None
    async for event in code_parser_agent.stream(local_path, branch, file_contents=file_contents):
        yield f"data: {json.dumps(event)}\n\n"
        if event["type"] == "result" and event.get("data"):
            code_parser_result = event["data"]

    # ── Step 3: TechStack ─────────────────────────────────────────
    tech_stack_agent = TechStackAgent()
    tech_stack_result = None
    async for event in tech_stack_agent.stream(local_path, branch, file_contents=file_contents):
        yield f"data: {json.dumps(event)}\n\n"
        if event["type"] == "result" and event.get("data"):
            tech_stack_result = event["data"]

    # ── Step 4: Quality ───────────────────────────────────────────
    quality_agent = QualityAgent()
    quality_result = None
    async for event in quality_agent.stream(local_path, branch, file_contents=file_contents):
        yield f"data: {json.dumps(event)}\n\n"
        if event["type"] == "result" and event.get("data"):
            quality_result = event["data"]

    # ── Step 5: Suggestion ────────────────────────────────────────
    suggestion_agent = SuggestionAgent()
    async for event in suggestion_agent.stream(
        local_path, branch,
        code_parser_result=code_parser_result,
        tech_stack_result=tech_stack_result,
        quality_result=quality_result,
        dependency_result=None,
    ):
        yield f"data: {json.dumps(event)}\n\n"

    yield "data: [DONE]\n\n"


def run_analysis_sync(
    repo_url: str,
    branch: str = "main",
    thread_id: str | None = None,
) -> dict:
    """同步运行 LangGraph 工作流，直接返回最终结果。

    使用 checkpointing：同一 thread_id 的请求可以恢复之前的状态。
    """
    config: dict[str, Any] = {
        "configurable": {
            "thread_id": thread_id or f"{repo_url}::{branch}",
        }
    }

    initial_state: SharedState = {
        "repo_url": repo_url,
        "branch": branch,
        "local_path": None,
        "file_contents": {},
        "repo_loader_result": None,
        "repo_tree": None,
        "repo_sha": None,
        "classified_files": None,
        "loaded_files": {},
        "pending_files": [],
        "llm_decision_rounds": 0,
        "llm_decision_history": [],
        "code_parser_result": None,
        "tech_stack_result": None,
        "quality_result": None,
        "suggestion_result": None,
        "final_result": None,
        "errors": [],
        "finished_agents": [],
    }

    final_state = _workflow.invoke(initial_state, config=config)
    return final_state.get("final_result") or {}


def build_initial_state(repo_url: str, branch: str = "main") -> SharedState:
    """构建 LangGraph 初始状态。"""
    return SharedState(
        repo_url=repo_url,
        branch=branch,
        local_path=None,
        file_contents={},
        repo_loader_result=None,
        repo_tree=None,
        repo_sha=None,
        classified_files=None,
        loaded_files={},
        pending_files=[],
        llm_decision_rounds=0,
        llm_decision_history=[],
        code_parser_result=None,
        tech_stack_result=None,
        quality_result=None,
        suggestion_result=None,
        final_result=None,
        errors=[],
        finished_agents=[],
    )
