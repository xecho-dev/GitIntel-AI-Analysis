import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
# Service role key（可绕过 RLS，用于写入 users 等需要高权限的操作）
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def get_supabase(user_id: str | None = None) -> Client:
    """返回 Supabase 客户端单例（server-side）。

    如果传入了 user_id，则设置 app.current_user_id session 变量，
    使 RLS 策略能正确识别当前用户。
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_KEY environment variables are required"
        )
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    if user_id:
        client.rpc("set_auth_user_id", {"p_auth_user_id": user_id}).execute()
    return client


def get_supabase_admin() -> Client:
    """返回拥有 service_role 权限的 Supabase 客户端（绕过 RLS）。

    如果 SUPABASE_SERVICE_KEY 未配置，则 fallback 到普通 anon key，
    并通过 set_config 设置当前用户，RLS 策略仍可正常工作。
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required"
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
