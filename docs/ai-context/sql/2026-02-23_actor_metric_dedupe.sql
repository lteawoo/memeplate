-- 목적: 조회수/좋아요를 actor 기준으로 중복 방지
-- 정책:
-- 1) 조회수(view): 동일 actor가 같은 리소스를 24시간 내 재조회하면 미증가
-- 2) 좋아요(like): 동일 actor가 같은 리소스에 재요청하면 미증가
-- 리소스 타입: template, remix

begin;

create table if not exists public.metric_actor_states (
  resource_type text not null check (resource_type in ('template', 'remix')),
  resource_id uuid not null,
  actor_key text not null,
  last_view_at timestamptz null,
  liked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (resource_type, resource_id, actor_key)
);

create index if not exists idx_metric_actor_states_updated_at
  on public.metric_actor_states (updated_at desc);

create or replace function public.increment_template_view_count_dedup(
  p_share_slug text,
  p_actor_key text
)
returns integer
language plpgsql
as $$
declare
  v_template_id uuid;
  v_view_count integer;
  v_should_increment boolean := false;
begin
  select id
    into v_template_id
  from public.templates
  where share_slug = p_share_slug
    and visibility = 'public'
    and deleted_at is null
  limit 1;

  if v_template_id is null then
    return null;
  end if;

  if coalesce(trim(p_actor_key), '') = '' then
    update public.templates
    set view_count = view_count + 1
    where id = v_template_id
    returning view_count into v_view_count;
    return v_view_count;
  end if;

  with changed as (
    insert into public.metric_actor_states (
      resource_type,
      resource_id,
      actor_key,
      last_view_at,
      created_at,
      updated_at
    )
    values (
      'template',
      v_template_id,
      p_actor_key,
      now(),
      now(),
      now()
    )
    on conflict (resource_type, resource_id, actor_key)
    do update set
      last_view_at = excluded.last_view_at,
      updated_at = now()
    where public.metric_actor_states.last_view_at is null
      or public.metric_actor_states.last_view_at < (now() - interval '24 hours')
    returning 1
  )
  select exists(select 1 from changed) into v_should_increment;

  if v_should_increment then
    update public.templates
    set view_count = view_count + 1
    where id = v_template_id
    returning view_count into v_view_count;
    return v_view_count;
  end if;

  select view_count into v_view_count
  from public.templates
  where id = v_template_id;
  return v_view_count;
end;
$$;

create or replace function public.increment_template_like_count_dedup(
  p_share_slug text,
  p_actor_key text
)
returns integer
language plpgsql
as $$
declare
  v_template_id uuid;
  v_like_count integer;
  v_should_increment boolean := false;
begin
  select id
    into v_template_id
  from public.templates
  where share_slug = p_share_slug
    and visibility = 'public'
    and deleted_at is null
  limit 1;

  if v_template_id is null then
    return null;
  end if;

  if coalesce(trim(p_actor_key), '') = '' then
    update public.templates
    set like_count = like_count + 1
    where id = v_template_id
    returning like_count into v_like_count;
    return v_like_count;
  end if;

  with changed as (
    insert into public.metric_actor_states (
      resource_type,
      resource_id,
      actor_key,
      liked_at,
      created_at,
      updated_at
    )
    values (
      'template',
      v_template_id,
      p_actor_key,
      now(),
      now(),
      now()
    )
    on conflict (resource_type, resource_id, actor_key)
    do update set
      liked_at = excluded.liked_at,
      updated_at = now()
    where public.metric_actor_states.liked_at is null
    returning 1
  )
  select exists(select 1 from changed) into v_should_increment;

  if v_should_increment then
    update public.templates
    set like_count = like_count + 1
    where id = v_template_id
    returning like_count into v_like_count;
    return v_like_count;
  end if;

  select like_count into v_like_count
  from public.templates
  where id = v_template_id;
  return v_like_count;
end;
$$;

create or replace function public.increment_meme_image_view_count_dedup(
  p_share_slug text,
  p_actor_key text
)
returns integer
language plpgsql
as $$
declare
  v_image_id uuid;
  v_view_count integer;
  v_should_increment boolean := false;
begin
  select id
    into v_image_id
  from public.meme_images
  where share_slug = p_share_slug
    and visibility = 'public'
    and deleted_at is null
  limit 1;

  if v_image_id is null then
    return null;
  end if;

  if coalesce(trim(p_actor_key), '') = '' then
    update public.meme_images
    set view_count = view_count + 1
    where id = v_image_id
    returning view_count into v_view_count;
    return v_view_count;
  end if;

  with changed as (
    insert into public.metric_actor_states (
      resource_type,
      resource_id,
      actor_key,
      last_view_at,
      created_at,
      updated_at
    )
    values (
      'remix',
      v_image_id,
      p_actor_key,
      now(),
      now(),
      now()
    )
    on conflict (resource_type, resource_id, actor_key)
    do update set
      last_view_at = excluded.last_view_at,
      updated_at = now()
    where public.metric_actor_states.last_view_at is null
      or public.metric_actor_states.last_view_at < (now() - interval '24 hours')
    returning 1
  )
  select exists(select 1 from changed) into v_should_increment;

  if v_should_increment then
    update public.meme_images
    set view_count = view_count + 1
    where id = v_image_id
    returning view_count into v_view_count;
    return v_view_count;
  end if;

  select view_count into v_view_count
  from public.meme_images
  where id = v_image_id;
  return v_view_count;
end;
$$;

create or replace function public.increment_meme_image_like_count_dedup(
  p_share_slug text,
  p_actor_key text
)
returns integer
language plpgsql
as $$
declare
  v_image_id uuid;
  v_like_count integer;
  v_should_increment boolean := false;
begin
  select id
    into v_image_id
  from public.meme_images
  where share_slug = p_share_slug
    and visibility = 'public'
    and deleted_at is null
  limit 1;

  if v_image_id is null then
    return null;
  end if;

  if coalesce(trim(p_actor_key), '') = '' then
    update public.meme_images
    set like_count = like_count + 1
    where id = v_image_id
    returning like_count into v_like_count;
    return v_like_count;
  end if;

  with changed as (
    insert into public.metric_actor_states (
      resource_type,
      resource_id,
      actor_key,
      liked_at,
      created_at,
      updated_at
    )
    values (
      'remix',
      v_image_id,
      p_actor_key,
      now(),
      now(),
      now()
    )
    on conflict (resource_type, resource_id, actor_key)
    do update set
      liked_at = excluded.liked_at,
      updated_at = now()
    where public.metric_actor_states.liked_at is null
    returning 1
  )
  select exists(select 1 from changed) into v_should_increment;

  if v_should_increment then
    update public.meme_images
    set like_count = like_count + 1
    where id = v_image_id
    returning like_count into v_like_count;
    return v_like_count;
  end if;

  select like_count into v_like_count
  from public.meme_images
  where id = v_image_id;
  return v_like_count;
end;
$$;

create or replace function public.toggle_template_like_count(
  p_share_slug text,
  p_actor_key text
)
returns jsonb
language plpgsql
as $$
declare
  v_template_id uuid;
  v_like_count integer;
  v_liked_at timestamptz;
  v_actor_key text;
begin
  select id
    into v_template_id
  from public.templates
  where share_slug = p_share_slug
    and visibility = 'public'
    and deleted_at is null
  limit 1;

  if v_template_id is null then
    return null;
  end if;

  v_actor_key := trim(coalesce(p_actor_key, ''));

  if v_actor_key = '' then
    update public.templates
    set like_count = like_count + 1
    where id = v_template_id
    returning like_count into v_like_count;
    return jsonb_build_object('likeCount', v_like_count, 'liked', true);
  end if;

  insert into public.metric_actor_states (
    resource_type,
    resource_id,
    actor_key,
    liked_at,
    created_at,
    updated_at
  )
  values (
    'template',
    v_template_id,
    v_actor_key,
    now(),
    now(),
    now()
  )
  on conflict (resource_type, resource_id, actor_key)
  do update set
    liked_at = case
      when public.metric_actor_states.liked_at is null then now()
      else null
    end,
    updated_at = now()
  returning liked_at into v_liked_at;

  update public.templates
  set like_count = greatest(
    0,
    like_count + case when v_liked_at is null then -1 else 1 end
  )
  where id = v_template_id
  returning like_count into v_like_count;

  return jsonb_build_object(
    'likeCount', v_like_count,
    'liked', (v_liked_at is not null)
  );
end;
$$;

create or replace function public.toggle_meme_image_like_count(
  p_share_slug text,
  p_actor_key text
)
returns jsonb
language plpgsql
as $$
declare
  v_image_id uuid;
  v_like_count integer;
  v_liked_at timestamptz;
  v_actor_key text;
begin
  select id
    into v_image_id
  from public.meme_images
  where share_slug = p_share_slug
    and visibility = 'public'
    and deleted_at is null
  limit 1;

  if v_image_id is null then
    return null;
  end if;

  v_actor_key := trim(coalesce(p_actor_key, ''));

  if v_actor_key = '' then
    update public.meme_images
    set like_count = like_count + 1
    where id = v_image_id
    returning like_count into v_like_count;
    return jsonb_build_object('likeCount', v_like_count, 'liked', true);
  end if;

  insert into public.metric_actor_states (
    resource_type,
    resource_id,
    actor_key,
    liked_at,
    created_at,
    updated_at
  )
  values (
    'remix',
    v_image_id,
    v_actor_key,
    now(),
    now(),
    now()
  )
  on conflict (resource_type, resource_id, actor_key)
  do update set
    liked_at = case
      when public.metric_actor_states.liked_at is null then now()
      else null
    end,
    updated_at = now()
  returning liked_at into v_liked_at;

  update public.meme_images
  set like_count = greatest(
    0,
    like_count + case when v_liked_at is null then -1 else 1 end
  )
  where id = v_image_id
  returning like_count into v_like_count;

  return jsonb_build_object(
    'likeCount', v_like_count,
    'liked', (v_liked_at is not null)
  );
end;
$$;

commit;
