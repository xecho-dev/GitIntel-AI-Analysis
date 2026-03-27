"""SuggestionAgent — 根据前面所有 Agent 的分析结果，生成可操作的优化建议。

使用 LangChain + LLM 生成更智能、更有深度的优化建议。
"""
import os
from typing import AsyncGenerator, Optional

from .base_agent import AgentEvent, BaseAgent, _make_event
from .prompts import SYSTEM_GITINTEL

# ─── LangChain LLM 懒加载 ─────────────────────────────────────────

def _get_llm():
    """懒加载 LLM client，优先 Anthropic，其次 OpenAI。"""
    try:
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            temperature=0.3,
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
            max_tokens=2048,
        )
    except Exception:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=os.getenv("OPENAI_MODEL", "gpt-4o"),
                temperature=0.3,
                openai_api_key=os.getenv("OPENAI_API_KEY"),
            )
        except Exception:
            return None


class SuggestionAgent(BaseAgent):
    """基于代码质量、依赖风险和技术栈分析结果，生成分级优化建议。"""

    name = "suggestion"

    async def run(
        self,
        repo_path: str,
        branch: str = "main",
        file_contents: dict | None = None,
        *,
        code_parser_result: dict | None = None,
        tech_stack_result: dict | None = None,
        quality_result: dict | None = None,
        dependency_result: dict | None = None,
    ) -> dict:
        """执行 Agent，收集并返回最终 result 数据。"""
        result = None
        async for event in self.stream(
            repo_path, branch,
            code_parser_result=code_parser_result,
            tech_stack_result=tech_stack_result,
            quality_result=quality_result,
            dependency_result=dependency_result,
        ):
            if event["type"] == "result":
                result = event["data"]
        return result or {}

    async def stream(
        self, repo_path: str, branch: str = "main",
        code_parser_result: dict | None = None,
        tech_stack_result: dict | None = None,
        quality_result: dict | None = None,
        dependency_result: dict | None = None,
    ) -> AsyncGenerator[AgentEvent, None]:
        """根据所有 Agent 结果生成优化建议列表。

        优先使用 LLM 生成智能建议，降级到规则引擎兜底。
        """
        yield _make_event(
            self.name, "status",
            "正在综合分析结果，生成优化建议…", 10, None
        )

        suggestions: list[dict] = []
        _id = [1]

        def next_id() -> int:
            v = _id[0]
            _id[0] += 1
            return v

        # ── 规则引擎兜底建议（始终执行） ────────────────────────
        if quality_result:
            suggestions.extend(self._quality_suggestions(quality_result, next_id))
        if dependency_result:
            suggestions.extend(self._dependency_suggestions(dependency_result, next_id))
        if tech_stack_result:
            suggestions.extend(self._tech_stack_suggestions(tech_stack_result, next_id))
        if code_parser_result:
            suggestions.extend(self._structure_suggestions(code_parser_result, next_id))

        # ── LLM 增强：发送结构化上下文给 LLM ──────────────────
        llm = _get_llm()
        if llm is not None:
            yield _make_event(
                self.name, "progress",
                "正在调用 LLM 生成深度优化建议…", 30, None
            )
            try:
                llm_suggestions = await self._generate_llm_suggestions(
                    repo_path, branch,
                    code_parser_result=code_parser_result,
                    tech_stack_result=tech_stack_result,
                    quality_result=quality_result,
                    dependency_result=dependency_result,
                )
                suggestions.extend(llm_suggestions)
            except Exception as exc:
                yield _make_event(
                    self.name, "progress",
                    f"LLM 生成失败，降级到规则引擎: {exc}", 30, None
                )

        # ── 兜底建议 ───────────────────────────────────────────
        if not suggestions:
            suggestions.append({
                "id": next_id(),
                "type": "general",
                "title": "项目整体状态良好",
                "description": "未检测到明显问题，建议持续关注代码质量和依赖安全。",
                "priority": "low",
                "category": "general",
            })
            yield _make_event(
                self.name, "progress",
                f"共生成 {len(suggestions)} 条优化建议，正在排序…", 60, None
            )

        # 按 priority 排序
        priority_order = {"high": 0, "medium": 1, "low": 2}
        suggestions.sort(key=lambda s: priority_order.get(s["priority"], 2))

        yield _make_event(
            self.name, "result", "优化建议生成完成",
            100,
            {
                "suggestions": suggestions,
                "total": len(suggestions),
                "high_priority": sum(1 for s in suggestions if s["priority"] == "high"),
                "medium_priority": sum(1 for s in suggestions if s["priority"] == "medium"),
                "low_priority": sum(1 for s in suggestions if s["priority"] == "low"),
            },
        )

    # ─── LLM 增强生成 ────────────────────────────────────────────

    @staticmethod
    async def _generate_llm_suggestions(
        repo_path: str,
        branch: str,
        code_parser_result: dict | None = None,
        tech_stack_result: dict | None = None,
        quality_result: dict | None = None,
        dependency_result: dict | None = None,
    ) -> list[dict]:
        """调用 LangChain LLM，基于所有分析结果生成深度优化建议。"""
        import json

        llm = _get_llm()
        if llm is None:
            return []

        context_parts = []

        if code_parser_result:
            context_parts.append(
                f"【代码结构】总文件数: {code_parser_result.get('total_files', '?')}, "
                f"总函数: {code_parser_result.get('total_functions', '?')}, "
                f"总类: {code_parser_result.get('total_classes', '?')}, "
                f"语言统计: {json.dumps(code_parser_result.get('language_stats', {}), ensure_ascii=False)}"
            )

        if tech_stack_result:
            context_parts.append(
                f"【技术栈】语言: {tech_stack_result.get('languages', [])}, "
                f"框架: {tech_stack_result.get('frameworks', [])}, "
                f"基础设施: {tech_stack_result.get('infrastructure', [])}, "
                f"开发工具: {tech_stack_result.get('dev_tools', [])}, "
                f"包管理器: {tech_stack_result.get('package_manager', 'unknown')}"
            )

        if quality_result:
            context_parts.append(
                f"【代码质量】健康度: {quality_result.get('health_score', '?')}, "
                f"测试覆盖率: {quality_result.get('test_coverage', '?')}%, "
                f"复杂度: {quality_result.get('complexity', '?')}, "
                f"可维护性: {quality_result.get('maintainability', '?')}, "
                f"重复率: {quality_result.get('duplication', {}).get('duplication_level', '?')}"
            )

        if dependency_result:
            context_parts.append(
                f"【依赖风险】总数: {dependency_result.get('total', '?')}, "
                f"高危: {dependency_result.get('high', 0)}, "
                f"中危: {dependency_result.get('medium', 0)}, "
                f"低危: {dependency_result.get('low', 0)}, "
                f"风险等级: {dependency_result.get('risk_level', '?')}"
            )

        context = "\n\n".join(context_parts) if context_parts else "（无详细分析数据）"

        # 使用 LangChain Prompt 模板（与 prompts.py 保持一致）
        try:
            from .prompts import build_suggestion_prompt
            prompt = build_suggestion_prompt(
                repo_path=repo_path,
                branch=branch,
                analysis_context=context,
            )
            # LangChain ChatPromptTemplate → invoke LLM
            response = await llm.ainvoke(
                prompt.invoke({
                    "system_context": SYSTEM_GITINTEL,
                    "repo_path": repo_path,
                    "branch": branch,
                    "analysis_context": context,
                })
            )
            content = response.content.strip()
        except Exception:
            # 降级：使用内联提示词
            content = await SuggestionAgent._call_llm_fallback(
                llm, repo_path, branch, context
            )

        # ── 解析 LLM 返回的 JSON 建议列表 ─────────────────────
        try:
            if content.startswith("["):
                suggestions = json.loads(content)
            else:
                import re
                match = re.search(r"\[[\s\S]*\]", content)
                if match:
                    suggestions = json.loads(match.group(0))
                else:
                    suggestions = []

            # 标准化字段
            validated: list[dict] = []
            for s in suggestions:
                if isinstance(s, dict) and "title" in s:
                    validated.append({
                        "id": s.get("id", 0),
                        "type": s.get("type", "general"),
                        "title": s.get("title", ""),
                        "description": s.get("description", ""),
                        "priority": s.get("priority", "medium"),
                        "category": s.get("category", "general"),
                        "source": "llm",
                    })
            return validated
        except Exception:
            return []

    @staticmethod
    async def _call_llm_fallback(
        llm, repo_path: str, branch: str, context: str
    ) -> str:
        """直接调用 LLM（不使用 ChatPromptTemplate，降级方案）。"""
        from langchain_core.messages import HumanMessage
        prompt = (
            f"你是一位资深软件架构师，正在分析仓库 {repo_path}@{branch}。\n"
            f"分析数据：\n{context}\n\n"
            "请生成 3~5 条 JSON 格式的优化建议，id 从 100 开始。"
            "直接返回 JSON 数组，不含 markdown。"
        )
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        return response.content.strip()

    # ─── 质量建议 ─────────────────────────────────────────────

    @staticmethod
    def _quality_suggestions(qr: dict, next_id) -> list[dict]:
        suggestions: list[dict] = []

        health = qr.get("health_score", 0)
        coverage = qr.get("test_coverage", 0)
        dup = qr.get("duplication", {})
        py_metrics = qr.get("python_metrics", {})
        ts_metrics = qr.get("typescript_metrics", {})

        if health < 60:
            suggestions.append({
                "id": next_id(),
                "type": "performance",
                "title": "代码健康度偏低 (< 60)",
                "description": f"当前健康度评分为 {health}，建议优先解决圈复杂度超标、代码重复率高等问题。",
                "priority": "high",
                "category": "quality",
            })

        if coverage < 30:
            suggestions.append({
                "id": next_id(),
                "type": "performance",
                "title": "测试覆盖率严重不足 (< 30%)",
                "description": f"当前测试覆盖率仅 {coverage}%。建议使用 Jest/Vitest (JS) 或 pytest (Python) 补充单元测试，重点覆盖核心业务逻辑。",
                "priority": "high",
                "category": "testing",
            })
        elif coverage < 60:
            suggestions.append({
                "id": next_id(),
                "type": "performance",
                "title": "测试覆盖率偏低 (< 60%)",
                "description": f"当前测试覆盖率为 {coverage}%，建议逐步补充关键模块的测试用例。",
                "priority": "medium",
                "category": "testing",
            })

        dup_info = dup.get("duplication_level", "Low")
        dup_score = dup.get("score", 0)
        if dup_info == "High" or dup_score > 15:
            suggestions.append({
                "id": next_id(),
                "type": "refactor",
                "title": "代码重复率较高",
                "description": f"重复率 {dup_score}%，建议将重复代码块抽取为公共函数或工具类，减少维护成本。",
                "priority": "medium",
                "category": "refactor",
            })

        for metrics, lang_label in [(py_metrics, "Python"), (ts_metrics, "TypeScript")]:
            over_complex = metrics.get("over_complexity_count", 0)
            if over_complex > 5:
                suggestions.append({
                    "id": next_id(),
                    "type": "performance",
                    "title": f"{lang_label}: 存在 {over_complex} 个高圈复杂度函数 (> 10)",
                    "description": "建议拆分大型函数，每个函数控制在 50 行以内，优先处理圈复杂度超过 15 的函数。",
                    "priority": "medium",
                    "category": "complexity",
                })

        long_funcs = py_metrics.get("long_functions", [])
        if long_funcs:
            top3 = ", ".join(f"`{f['function']}`" for f in long_funcs[:3])
            suggestions.append({
                "id": next_id(),
                "type": "refactor",
                "title": f"存在 {len(long_funcs)} 个超长 Python 函数 (> 50 行)",
                "description": f"最长的函数包括: {top3}。建议按职责拆分为更小的函数。",
                "priority": "low",
                "category": "readability",
            })

        return suggestions

    # ─── 依赖建议 ─────────────────────────────────────────────

    @staticmethod
    def _dependency_suggestions(dr: dict, next_id) -> list[dict]:
        suggestions: list[dict] = []

        high = dr.get("high", 0)
        medium = dr.get("medium", 0)
        risk_level = dr.get("risk_level", "")
        deps = dr.get("deps", [])

        if risk_level == "高危" or high > 0:
            suggestions.append({
                "id": next_id(),
                "type": "security",
                "title": "存在高风险依赖",
                "description": "检测到高危依赖，可能包含已知安全漏洞。建议立即更新或替换相关依赖包。",
                "priority": "high",
                "category": "security",
            })

        if medium > 5:
            suggestions.append({
                "id": next_id(),
                "type": "security",
                "title": f"存在 {medium} 个中等风险依赖",
                "description": "建议审查这些依赖的版本，使用 `npm audit` / `pip-audit` / `cargo audit` 定期扫描已知漏洞。",
                "priority": "medium",
                "category": "security",
            })

        no_version = [d for d in deps if not d.get("version") or d["version"] == "*"]
        if no_version:
            suggestions.append({
                "id": next_id(),
                "type": "performance",
                "title": f"存在 {len(no_version)} 个依赖未锁定版本",
                "description": "未指定版本的依赖可能在不同环境下引入不一致性，建议使用精确版本号或语义化版本范围。",
                "priority": "medium",
                "category": "dependency",
            })

        # 特定过时框架警告
        names = {d["name"].lower() for d in deps}
        outdated_flags = {
            "request": "request 库已废弃，建议迁移到 axios 或原生 fetch",
            "lodash": "lodash 体积较大，建议按需引入或使用原生方法替代",
            "moment": "moment 已停止维护，建议迁移到 dayjs 或 date-fns",
            "jquery": "jQuery 在现代前端项目中通常可移除，建议评估是否必要",
        }
        for pkg, desc in outdated_flags.items():
            if pkg in names:
                suggestions.append({
                    "id": next_id(),
                    "type": "refactor",
                    "title": f"检测到过时依赖: {pkg}",
                    "description": desc,
                    "priority": "medium",
                    "category": "dependency",
                })

        return suggestions

    # ─── 技术栈建议 ───────────────────────────────────────────

    @staticmethod
    def _tech_stack_suggestions(ts: dict, next_id) -> list[dict]:
        suggestions: list[dict] = []

        frameworks = ts.get("frameworks", [])
        langs = ts.get("languages", [])
        infra = ts.get("infrastructure", [])
        dev_tools = ts.get("dev_tools", [])

        if "Docker" in infra and "docker-compose" not in infra:
            suggestions.append({
                "id": next_id(),
                "type": "performance",
                "title": "建议添加 docker-compose.yml",
                "description": "项目已有 Dockerfile，建议添加 docker-compose.yml 以简化本地开发和多容器编排。",
                "priority": "low",
                "category": "infrastructure",
            })

        has_ci = any(f.lower() in str(dev_tools).lower() for f in [
            "github actions", "gitlab ci", "jenkins", "circleci"
        ])
        if "Docker" in infra and not has_ci:
            suggestions.append({
                "id": next_id(),
                "type": "performance",
                "title": "建议配置 CI/CD 流水线",
                "description": "项目使用了容器化但未检测到 CI 配置，建议添加 GitHub Actions 或 GitLab CI 配置文件。",
                "priority": "medium",
                "category": "infrastructure",
            })

        if "TypeScript" in langs:
            suggestions.append({
                "id": next_id(),
                "type": "performance",
                "title": "建议启用 TypeScript 严格模式",
                "description": "在 tsconfig.json 中设置 `strict: true`，开启严格类型检查可以显著减少运行时错误。",
                "priority": "low",
                "category": "quality",
            })

        ai_keywords = ["LangChain", "LangGraph", "Anthropic SDK", "OpenAI SDK", "LLM", "AI"]
        ai_detected = [kw for kw in ai_keywords if kw in frameworks]
        if ai_detected:
            suggestions.append({
                "id": next_id(),
                "type": "performance",
                "title": "检测到 AI/LLM 技术栈",
                "description": f"项目使用了 {', '.join(ai_detected)}。建议: (1) 使用结构化输出（pydantic / zod）确保响应格式稳定；(2) 添加 token 用量监控防止超出限额。",
                "priority": "medium",
                "category": "architecture",
            })

        return suggestions

    # ─── 结构建议 ─────────────────────────────────────────────

    @staticmethod
    def _structure_suggestions(cr: dict, next_id) -> list[dict]:
        suggestions: list[dict] = []

        largest = cr.get("largest_files", [])
        if largest and largest[0].get("lines", 0) > 500:
            fname = largest[0]["path"].split("/")[-1]
            suggestions.append({
                "id": next_id(),
                "type": "refactor",
                "title": f"最大文件超过 500 行: {fname}",
                "description": f"该文件共 {largest[0]['lines']} 行。建议按功能模块拆分为多个小文件，每个文件职责单一。",
                "priority": "medium",
                "category": "readability",
            })

        total_classes = cr.get("total_classes", 0)
        total_funcs = cr.get("total_functions", 0)
        if total_funcs > 200 and total_classes < 10:
            suggestions.append({
                "id": next_id(),
                "type": "refactor",
                "title": "建议引入更多面向对象设计",
                "description": f"项目有 {total_funcs} 个函数但仅 {total_classes} 个类，可能存在过程式风格过重的问题。建议适当引入类/模块化设计，提高代码复用性。",
                "priority": "low",
                "category": "architecture",
            })

        lang_stats = cr.get("language_stats", {})
        if "python" in lang_stats:
            py_stats = lang_stats["python"]
            if py_stats.get("classes", 0) == 0 and py_stats.get("functions", 0) > 20:
                suggestions.append({
                    "id": next_id(),
                    "type": "refactor",
                    "title": "Python 项目未使用类，建议评估是否适用",
                    "description": "Python 支持面向对象和函数式编程，但对于大型项目，适度使用类可以提高代码组织性。",
                    "priority": "low",
                    "category": "architecture",
                })

        return suggestions
