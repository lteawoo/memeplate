-- 목적: 조회수 증가를 원자적(atomic)으로 처리해 동시성 유실 방지
-- 적용 대상: templates, meme_images

begin;

create or replace function public.increment_template_view_count(p_share_slug text)
returns integer
language plpgsql
as $$
declare
  v_view_count integer;
begin
  update public.templates
  set view_count = view_count + 1
  where share_slug = p_share_slug
    and visibility = 'public'
    and deleted_at is null
  returning view_count into v_view_count;

  return v_view_count;
end;
$$;

create or replace function public.increment_meme_image_view_count(p_share_slug text)
returns integer
language plpgsql
as $$
declare
  v_view_count integer;
begin
  update public.meme_images
  set view_count = view_count + 1
  where share_slug = p_share_slug
    and visibility = 'public'
    and deleted_at is null
  returning view_count into v_view_count;

  return v_view_count;
end;
$$;

commit;
