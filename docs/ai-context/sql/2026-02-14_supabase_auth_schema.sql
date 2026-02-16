-- 목적: 다중 OAuth 공급자 확장을 고려한 최소 인증 스키마
-- 정책:
-- 1) 프로필 이미지(avatar)는 저장하지 않음
-- 2) OAuth 공급자별 식별자는 auth_identities에서 관리
-- 3) 로그인 세션은 서버 세션 테이블로 관리

begin;

create extension if not exists pgcrypto;


create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  provider_email text,
  created_at timestamptz not null default now(),
  constraint auth_identities_provider_key_format check (provider ~ '^[a-z0-9_]+$'),
  constraint auth_identities_provider_user_unique unique (provider, provider_user_id),
  constraint auth_identities_user_provider_unique unique (user_id, provider)
);

create index if not exists idx_auth_identities_user_id
  on public.auth_identities(user_id);

create index if not exists idx_auth_identities_provider_email
  on public.auth_identities(provider_email);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_sessions_user_id
  on public.sessions(user_id);

create index if not exists idx_sessions_expires_at
  on public.sessions(expires_at);

create index if not exists idx_sessions_revoked_at
  on public.sessions(revoked_at);

commit;

-- 후속 구현 메모
-- - OAuth 콜백 처리:
--   1) (provider, provider_user_id)로 auth_identities 조회
--   2) 없으면 users 생성 후 auth_identities insert
--   3) sessions 생성 후 쿠키 발급
-- - provider 추가 시 users 스키마는 변경하지 않고 auth_identities만 확장
