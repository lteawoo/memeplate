-- 목적: templates.thumbnail_url 컬럼 제거
-- 배경:
-- 1) 템플릿 대표 이미지는 content.objects[].src(배경 이미지 URL)에서 계산해 응답
-- 2) thumbnail_url 별도 저장 제거로 데이터 모델 단순화

begin;

alter table public.templates
  drop column if exists thumbnail_url;

commit;
