-- 템플릿/리믹스 설명(description) 컬럼 추가
-- 적용 대상: templates, meme_images

alter table if exists public.templates
  add column if not exists description text;

alter table if exists public.meme_images
  add column if not exists description text;
