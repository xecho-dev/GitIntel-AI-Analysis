"""GitIntel 数据库操作层（直接调用 Supabase Python SDK）。"""
from datetime import datetime
from typing import Optional
from supabase_client import Client
from schemas.history import (
    HistoryItem,
    HistoryStats,
    HistoryListResponse,
    SaveAnalysisResponse,
    UserProfile,
)


def _derive_history_metrics(result_data: dict) -> dict:
    """从 Agent 结果 JSON 中提取健康度、风险等级等元数据。"""
    quality_res = result_data.get("quality", {})
    dep_res = result_data.get("dependency", {})
    arch_res = result_data.get("architecture", {})

    health = quality_res.get("healthScore", 0) or 0
    risk_high = dep_res.get("high", 0) or 0
    risk_med = dep_res.get("medium", 0) or 0

    if health >= 85:
        health_label = f"优 ({health}%)"
    elif health >= 60:
        health_label = f"良 ({health}%)"
    else:
        health_label = f"危 ({health}%)"

    if health >= 85:
        quality_score = "A+"
    elif health >= 75:
        quality_score = "A"
    elif health >= 65:
        quality_score = "B+"
    elif health >= 55:
        quality_score = "B"
    elif health >= 45:
        quality_score = "C"
    else:
        quality_score = "C-"

    if risk_high > 0:
        risk_level = "高危"
        risk_color = "text-rose-400"
        risk_bg = "bg-rose-400"
        border = "border-rose-400"
    elif risk_med > 0:
        risk_level = "中等"
        risk_color = "text-purple-400"
        risk_bg = "bg-purple-400"
        border = "border-purple-400"
    else:
        risk_level = "极低"
        risk_color = "text-emerald-400"
        risk_bg = "bg-emerald-400"
        border = "border-blue-400"

    return {
        "health_score": health,
        "health_label": health_label,
        "quality_score": quality_score,
        "risk_level": risk_level,
        "risk_level_color": risk_color,
        "risk_level_bg": risk_bg,
        "border_color": border,
        "complexity": arch_res.get("complexity", "Medium"),
    }


def save_analysis(
    sb: Client,
    auth_user_id: str,
    repo_url: str,
    branch: str,
    result_data: dict,
) -> SaveAnalysisResponse:
    """保存一次分析结果，返回新记录的 id。"""
    metrics = _derive_history_metrics(result_data)

    # 从 repo_url 提取 repo_name（"owner/repo"）
    repo_name = repo_url.rstrip("/").split("/")[-1]

    data, _ = (
        sb.table("analysis_history")
        .insert(
            {
                "user_id": auth_user_id,  # uuid — 需要先 upsert user
                "repo_url": repo_url,
                "repo_name": repo_name,
                "branch": branch,
                "result_data": result_data,
                "health_score": metrics["health_score"],
                "quality_score": metrics["quality_score"],
                "risk_level": metrics["risk_level"],
                "risk_level_color": metrics["risk_level_color"],
                "risk_level_bg": metrics["risk_level_bg"],
                "border_color": metrics["border_color"],
            }
        )
        .execute()
    )
    row = data[0]
    return SaveAnalysisResponse(id=row["id"], created_at=row["created_at"])


def get_history(
    sb: Client,
    auth_user_id: str,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
) -> HistoryListResponse:
    """分页查询用户的分析历史。"""
    offset = (page - 1) * page_size

    # 先找 user uuid
    user_row = (
        sb.table("users")
        .select("id")
        .eq("auth_user_id", auth_user_id)
        .maybe_single()
        .execute()
    )
    if not user_row:
        return HistoryListResponse(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
            stats=HistoryStats(total_scans=0, avg_health_score=0, high_risk_count=0, medium_risk_count=0),
        )
    user_uuid = user_row.data["id"]

    # 查询历史
    query = (
        sb.table("analysis_history")
        .select("*")
        .eq("user_id", user_uuid)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if search:
        query = query.ilike("repo_name", f"%{search}%")

    data = query.execute()

    # 查询总数
    count_query = (
        sb.table("analysis_history")
        .select("id", count="exact")
        .eq("user_id", user_uuid)
    )
    if search:
        count_query = count_query.ilike("repo_name", f"%{search}%")
    count_data = count_query.execute()
    total = count_data.count or 0

    # 查询统计数据
    stats_data = (
        sb.table("analysis_history")
        .select("health_score, risk_level")
        .eq("user_id", user_uuid)
        .execute()
    )
    rows = stats_data.data or []
    scores = [r["health_score"] for r in rows if r.get("health_score") is not None]
    avg_hs = round(sum(scores) / len(scores), 1) if scores else 0
    high_count = sum(1 for r in rows if r.get("risk_level") == "高危")
    med_count = sum(1 for r in rows if r.get("risk_level") == "中等")

    items = [
        HistoryItem(
            id=r["id"],
            repo_url=r["repo_url"],
            repo_name=r["repo_name"],
            branch=r.get("branch", "main"),
            health_score=r.get("health_score"),
            quality_score=r.get("quality_score"),
            risk_level=r.get("risk_level"),
            risk_level_color=r.get("risk_level_color"),
            risk_level_bg=r.get("risk_level_bg"),
            border_color=r.get("border_color"),
            result_data=r.get("result_data"),
            created_at=r["created_at"],
        )
        for r in data.data
    ]

    return HistoryListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        stats=HistoryStats(
            total_scans=len(rows),
            avg_health_score=avg_hs,
            high_risk_count=high_count,
            medium_risk_count=med_count,
        ),
    )


def delete_analysis(sb: Client, auth_user_id: str, history_id: str) -> bool:
    """删除指定历史记录。"""
    user_row = (
        sb.table("users")
        .select("id")
        .eq("auth_user_id", auth_user_id)
        .maybe_single()
        .execute()
    )
    if not user_row:
        return False
    user_uuid = user_row.data["id"]

    sb.table("analysis_history").delete().eq("id", history_id).eq("user_id", user_uuid).execute()
    return True


def upsert_user(sb: Client, auth_user_id: str, payload: dict) -> UserProfile:
    """Upsert GitHub 用户信息。"""
    payload_clean = {k: v for k, v in payload.items() if v is not None and v != ""}
    payload_clean["auth_user_id"] = auth_user_id
    payload_clean["updated_at"] = datetime.utcnow().isoformat()

    data, _ = (
        sb.table("users")
        .upsert(payload_clean, on_conflict="auth_user_id")
        .execute()
    )
    r = data[0]
    return UserProfile(
        id=r["id"],
        auth_user_id=r["auth_user_id"],
        github_id=r.get("github_id"),
        login=r["login"],
        email=r.get("email"),
        avatar_url=r.get("avatar_url"),
        name=r.get("name"),
        bio=r.get("bio"),
        company=r.get("company"),
        location=r.get("location"),
        blog=r.get("blog"),
        public_repos=r.get("public_repos", 0),
        followers=r.get("followers", 0),
        following=r.get("following", 0),
        created_at=r["created_at"],
        updated_at=r.get("updated_at", r["created_at"]),
    )


def get_user_profile(sb: Client, auth_user_id: str) -> Optional[UserProfile]:
    """获取用户资料。"""
    data = (
        sb.table("users")
        .select("*")
        .eq("auth_user_id", auth_user_id)
        .maybe_single()
        .execute()
    )
    if not data:
        return None
    r = data.data
    return UserProfile(
        id=r["id"],
        auth_user_id=r["auth_user_id"],
        github_id=r.get("github_id"),
        login=r["login"],
        email=r.get("email"),
        avatar_url=r.get("avatar_url"),
        name=r.get("name"),
        bio=r.get("bio"),
        company=r.get("company"),
        location=r.get("location"),
        blog=r.get("blog"),
        public_repos=r.get("public_repos", 0),
        followers=r.get("followers", 0),
        following=r.get("following", 0),
        created_at=r["created_at"],
        updated_at=r.get("updated_at", r["created_at"]),
    )


def get_user_uuid(sb: Client, auth_user_id: str) -> Optional[str]:
    """根据 auth_user_id 查找用户的 uuid。"""
    data = (
        sb.table("users")
        .select("id")
        .eq("auth_user_id", auth_user_id)
        .maybe_single()
        .execute()
    )
    return data.data["id"] if data else None
