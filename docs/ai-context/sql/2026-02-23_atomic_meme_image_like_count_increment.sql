-- 목적: 리믹스(밈 이미지) 좋아요 증가를 원자적(atomic)으로 처리해 동시성 유실 방지

begin;

create or replace function public.increment_meme_image_like_count(p_share_slug text)
returns integer
language plpgsql
as $$
declare
  v_like_count integer;
begin
  update public.meme_images
  set like_count = like_count + 1
  where share_slug = p_share_slug
    and visibility = 'public'
    and deleted_at is null
  returning like_count into v_like_count;

  return v_like_count;
end;
$$;

commit;
