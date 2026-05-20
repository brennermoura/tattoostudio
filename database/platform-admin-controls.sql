-- Admin controls for MVP operation.
-- Run this in Supabase SQL Editor.
--
-- Adds:
-- - editable platform monthly price
-- - admin RPCs to read/update the price
-- - admin RPC to block/unblock an artist profile

create table if not exists public.platform_settings (
  id boolean primary key default true,
  monthly_price_cents integer not null default 4900 check (monthly_price_cents >= 100),
  updated_at timestamptz not null default now(),
  check (id = true)
);

insert into public.platform_settings (id, monthly_price_cents)
values (true, 4900)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "Admins can read platform settings" on public.platform_settings;
create policy "Admins can read platform settings"
on public.platform_settings for select
using (public.is_platform_admin());

drop policy if exists "Admins can update platform settings" on public.platform_settings;
create policy "Admins can update platform settings"
on public.platform_settings for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

create or replace function public.get_platform_billing_settings()
returns table (
  monthly_price_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas administradores podem acessar configuracoes.';
  end if;

  return query
  select s.monthly_price_cents
  from public.platform_settings s
  where s.id = true;
end;
$$;

grant execute on function public.get_platform_billing_settings() to authenticated;

create or replace function public.admin_update_platform_monthly_price(
  p_monthly_price_cents integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_price integer := greatest(coalesce(p_monthly_price_cents, 0), 100);
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas administradores podem alterar o preco.';
  end if;

  update public.platform_settings
  set monthly_price_cents = next_price,
      updated_at = now()
  where id = true;

  return next_price;
end;
$$;

grant execute on function public.admin_update_platform_monthly_price(integer) to authenticated;

create or replace function public.get_platform_monthly_price()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select monthly_price_cents
  from public.platform_settings
  where id = true;
$$;

grant execute on function public.get_platform_monthly_price() to anon, authenticated;

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
