-- 목적: 결과물(이미지) 공유 도메인 분리
-- 용어:
-- - templates: 편집 가능한 템플릿(소스)
-- - meme_images: 최종 이미지(결과물)
-- 정책:
-- 1) 템플릿과 이미지를 분리해 각각 독립 목록/상세/관리 제공
-- 2) 이미지는 template_id를 선택적으로 연결(원본 템플릿 추적용)
-- 3) 삭제는 soft delete(deleted_at) 사용
-- 4) 공개 공유는 share_slug 기반

begin;

create extension if not exists pgcrypto;

create table if not exists public.meme_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null,
  title text not null check (char_length(title) between 1 and 100),
  image_url text not null,
  image_width integer check (image_width is null or image_width > 0),
  image_height integer check (image_height is null or image_height > 0),
  image_bytes integer check (image_bytes is null or image_bytes >= 0),
  image_mime text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  share_slug text not null unique,
  view_count integer not null default 0 check (view_count >= 0),
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_meme_images_owner_updated
  on public.meme_images(owner_id, updated_at desc)
  where deleted_at is null;

create index if not exists idx_meme_images_public_updated
  on public.meme_images(visibility, updated_at desc)
  where deleted_at is null;

create index if not exists idx_meme_images_template_updated
  on public.meme_images(template_id, updated_at desc)
  where deleted_at is null;

create unique index if not exists uq_meme_images_share_slug_active
  on public.meme_images(share_slug)
  where deleted_at is null;

commit;
