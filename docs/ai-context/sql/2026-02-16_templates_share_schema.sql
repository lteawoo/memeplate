-- 목적: 템플릿 공유/목록/관리 MVP용 templates 스키마
-- 정책:
-- 1) share slug는 한글 제목 기반이 아니라 영숫자 토큰 기반
-- 2) 삭제는 soft delete(deleted_at) 사용
-- 3) 목록 기본 정렬은 최신순(updated_at desc)

begin;

create extension if not exists pgcrypto;

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  content jsonb not null,
  thumbnail_url text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  share_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists trg_templates_updated_at on public.templates;
create trigger trg_templates_updated_at
before update on public.templates
for each row
execute function public.set_updated_at();

create index if not exists idx_templates_owner_updated
  on public.templates(owner_id, updated_at desc)
  where deleted_at is null;

create index if not exists idx_templates_public_updated
  on public.templates(visibility, updated_at desc)
  where deleted_at is null;

create unique index if not exists uq_templates_share_slug_active
  on public.templates(share_slug)
  where deleted_at is null;

commit;
