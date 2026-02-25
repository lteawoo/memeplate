-- 목적: 리믹스(공개 결과물) 상세에 댓글 기능을 추가한다.
-- 정책:
-- 1) 댓글은 공개 리믹스 기준으로 노출한다.
-- 2) 댓글 본문은 1~500자 제한을 적용한다.
-- 3) depth는 2단으로 고정하고, 대댓글의 대댓글은 같은 대댓글 레벨로 저장한다.
--    - root_comment_id: 최상위 댓글
--    - reply_to_comment_id: 직접 답글 대상 댓글
-- 4) 삭제는 soft delete(deleted_at) 패턴을 따른다.

begin;

create extension if not exists pgcrypto;

create table if not exists public.remix_comments (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.meme_images(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  root_comment_id uuid references public.remix_comments(id) on delete set null,
  reply_to_comment_id uuid references public.remix_comments(id) on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint remix_comments_reply_consistency check (
    (root_comment_id is null and reply_to_comment_id is null)
    or (root_comment_id is not null and reply_to_comment_id is not null)
  )
);

alter table public.remix_comments
  add column if not exists root_comment_id uuid references public.remix_comments(id) on delete set null;

alter table public.remix_comments
  add column if not exists reply_to_comment_id uuid references public.remix_comments(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'remix_comments_reply_consistency'
      and conrelid = 'public.remix_comments'::regclass
  ) then
    alter table public.remix_comments
      add constraint remix_comments_reply_consistency check (
        (root_comment_id is null and reply_to_comment_id is null)
        or (root_comment_id is not null and reply_to_comment_id is not null)
      );
  end if;
end $$;

create index if not exists idx_remix_comments_image_created
  on public.remix_comments(image_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_remix_comments_author_created
  on public.remix_comments(author_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_remix_comments_root_created
  on public.remix_comments(root_comment_id, created_at asc)
  where deleted_at is null;

create index if not exists idx_remix_comments_reply_to
  on public.remix_comments(reply_to_comment_id)
  where deleted_at is null;

commit;
