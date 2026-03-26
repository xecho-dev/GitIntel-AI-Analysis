-- ============================================================
-- GitIntel Database Schema Migration
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Enable UUID extension (already enabled on most Supabase projects)
create extension if not exists "uuid-ossp";

-- ============================================================
-- Table: users
-- 存储 GitHub OAuth 用户基本信息（从 NextAuth session 同步）
-- ============================================================
create table if not exists public.users (
    id              uuid primary key default uuid_generate_v4(),
    -- NextAuth user id (sub claim from JWT)
    auth_user_id    text unique not null,
    github_id       text unique,
    login           text not null,
    email           text,
    avatar_url      text,
    name            text,
    bio             text,
    company         text,
    location        text,
    blog            text,
    public_repos    integer default 0,
    followers       integer default 0,
    following       integer default 0,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

comment on table public.users is 'GitHub OAuth user profiles synced from NextAuth session';
comment on column public.users.auth_user_id is 'NextAuth sub claim — used as foreign key in other tables';

-- RLS
alter table public.users enable row level security;

create policy "Users can view their own profile"
    on public.users for select
    using (auth_user_id = current_setting('app.current_user_id', true));

create policy "Users can update their own profile"
    on public.users for update
    using (auth_user_id = current_setting('app.current_user_id', true));


-- ============================================================
-- Table: analysis_history
-- 记录每次仓库分析的元数据
-- ============================================================
create table if not exists public.analysis_history (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references public.users(id) on delete cascade,

    repo_url        text not null,
    repo_name       text not null,
    branch          text default 'main',

    -- 健康度得分（0-100）
    health_score    numeric(5,2),

    -- 4 个 Agent 的汇总评分
    quality_score   text,
    risk_level      text,
    risk_level_color text,
    risk_level_bg   text,
    border_color    text,

    -- 原始 JSON（完整分析结果）
    result_data     jsonb,

    created_at      timestamptz default now()
);

comment on table public.analysis_history is 'Repository analysis history per user';

alter table public.analysis_history enable row level security;

create policy "Users can view their own history"
    on public.analysis_history for select
    using (user_id in (
        select id from public.users
        where auth_user_id = current_setting('app.current_user_id', true)
    ));

create policy "Users can insert their own history"
    on public.analysis_history for insert
    with check (user_id in (
        select id from public.users
        where auth_user_id = current_setting('app.current_user_id', true)
    ));

create policy "Users can delete their own history"
    on public.analysis_history for delete
    using (user_id in (
        select id from public.users
        where auth_user_id = current_setting('app.current_user_id', true)
    ));

-- Index for fast per-user history lookup
create index if not exists idx_analysis_history_user_id
    on public.analysis_history(user_id, created_at desc);


-- ============================================================
-- Function: handle_new_user
-- Auto-create a user row when they first sign in via GitHub
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.users (
        auth_user_id,
        github_id,
        login,
        email,
        avatar_url,
        name,
        bio,
        company,
        location,
        blog,
        public_repos,
        followers,
        following
    ) values (
        new->>'sub',
        new->>'githubId',
        coalesce(new->>'login', ''),
        new->>'email',
        new->>'image',
        new->>'name',
        new->>'bio',
        new->>'company',
        new->>'location',
        new->>'blog',
        coalesce((new->>'public_repos')::int, 0),
        coalesce((new->>'followers')::int, 0),
        coalesce((new->>'following')::int, 0)
    )
    on conflict (auth_user_id) do update set
        github_id       = coalesce(excluded.github_id,       users.github_id),
        login           = excluded.login,
        email           = coalesce(excluded.email,            users.email),
        avatar_url      = excluded.avatar_url,
        name            = excluded.name,
        bio             = excluded.bio,
        company         = excluded.company,
        location        = excluded.location,
        blog            = excluded.blog,
        public_repos    = excluded.public_repos,
        followers       = excluded.followers,
        following       = excluded.following,
        updated_at      = now()
    where excluded.updated_at > users.updated_at
       or users.updated_at is null;
    return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Trigger: sync user on auth.users insert/update
-- (Requires RLS bypass for service_role, skip if not needed)
-- ============================================================
-- Note: NextAuth stores users in auth.users; if you want auto-sync,
-- create a trigger there. For simplicity, we sync via the API instead.
-- The `upsert_user` API endpoint handles user profile updates.


create or replace function public.get_or_create_user_by_auth_id(p_auth_user_id text)
returns uuid as $$
declare
    v_user_id uuid;
begin
    select id into v_user_id from public.users where auth_user_id = p_auth_user_id;
    if v_user_id is null then
        insert into public.users (auth_user_id, login)
        values (p_auth_user_id, split_part(p_auth_user_id, '-', 1))
        returning id into v_user_id;
    end if;
    return v_user_id;
end;
$$ language plpgsql security definer;


-- ============================================================
-- Helper: set_auth_user_id (called via Supabase RPC)
-- Sets the session variable used by RLS policies
-- ============================================================
create or replace function public.set_auth_user_id(p_auth_user_id text)
returns void as $$
begin
    perform set_config('app.current_user_id', p_auth_user_id, true);
end;
$$ language plpgsql security definer;


-- ============================================================
-- RLS policy: Users can INSERT their own profile
-- (needed for upsert auto-creation on first login)
-- ============================================================
create policy "Users can insert their own profile"
    on public.users for insert
    with check (auth_user_id = current_setting('app.current_user_id', true));
