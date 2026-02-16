-- 목적: 기존 templates 테이블에 조회수/좋아요 카운트 필드 추가
-- 적용 대상: 이미 templates 테이블이 존재하는 환경

begin;

alter table public.templates
  add column if not exists view_count integer not null default 0 check (view_count >= 0),
  add column if not exists like_count integer not null default 0 check (like_count >= 0);

commit;
