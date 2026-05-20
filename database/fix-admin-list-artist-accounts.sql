-- Fixes admin_list_artist_accounts RPC 400.
-- This version keeps the admin list read-only and avoids nested admin sync
-- so the dashboard does not fail while loading.
-- Run this in Supabase SQL Editor.

drop function if exists public.admin_list_artist_accounts();

create or replace function public.admin_list_artist_accounts()
returns table (
  artist_id uuid,
  user_id uuid,
  email text,
  slug text,
  artistic_name text,
  real_name text,
  instagram text,
  whatsapp text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  plan_status text,
  created_at timestamptz,
  access_until timestamptz,
  access_lifetime boolean,
  access_source text,
  latest_grant_note text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas administradores podem acessar.';
  end if;

  return query
  select
    p.id as artist_id,
    p.user_id,
    coalesce(u.email::text, '') as email,
    p.slug,
    p.artistic_name,
    p.real_name,
    p.instagram,
    p.whatsapp,
    p.city,
    p.state,
    p.latitude,
    p.longitude,
    p.plan_status::text,
    p.created_at,
    g.ends_at as access_until,
    coalesce(g.lifetime, false) as access_lifetime,
    coalesce(g.grant_type, 'none') as access_source,
    coalesce(g.note, '') as latest_grant_note
  from public.artist_profiles p
  left join auth.users u on u.id = p.user_id
  left join lateral (
    select access_grant.ends_at, access_grant.lifetime, access_grant.grant_type, access_grant.note
    from public.artist_access_grants access_grant
    where access_grant.artist_id = p.id
      and access_grant.starts_at <= now()
      and (access_grant.lifetime = true or access_grant.ends_at > now())
    order by access_grant.lifetime desc, access_grant.ends_at desc nulls last, access_grant.created_at desc
    limit 1
  ) g on true
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_artist_accounts() to authenticated;

create or replace function public.admin_set_artist_blocked(
  p_artist_id uuid,
  p_blocked boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas administradores podem bloquear usuarios.';
  end if;

  update public.artist_profiles
  set plan_status = case when coalesce(p_blocked, false) then 'blocked' else 'active' end
  where id = p_artist_id;
end;
$$;

grant execute on function public.admin_set_artist_blocked(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
