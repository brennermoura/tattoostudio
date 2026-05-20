-- Self-service grace period for blocked artists.
-- Run in Supabase SQL Editor.
--
-- Rule:
-- - artist can unlock own account for 5 days
-- - only when there is no active access
-- - only once per calendar month

alter table public.artist_access_grants
drop constraint if exists artist_access_grants_grant_type_check;

alter table public.artist_access_grants
add constraint artist_access_grants_grant_type_check
check (grant_type in ('trial', 'manual_free', 'self_grace', 'paid_pix', 'paid_mercado_pago', 'paid_infinitepay', 'lifetime'));

create or replace function public.can_claim_artist_monthly_grace(p_artist_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start timestamptz := date_trunc('month', now());
begin
  if not exists (
    select 1
    from public.artist_profiles p
    where p.id = p_artist_id
      and p.user_id = auth.uid()
  ) then
    return false;
  end if;

  if public.artist_has_active_access(p_artist_id) then
    return false;
  end if;

  return not exists (
    select 1
    from public.artist_access_grants g
    where g.artist_id = p_artist_id
      and g.grant_type = 'self_grace'
      and g.created_at >= month_start
  );
end;
$$;

grant execute on function public.can_claim_artist_monthly_grace(uuid) to authenticated;

create or replace function public.claim_artist_monthly_grace(p_artist_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  ends_at timestamptz := now() + interval '5 days';
begin
  if not public.can_claim_artist_monthly_grace(p_artist_id) then
    raise exception 'Desbloqueio temporario indisponivel para esta conta.';
  end if;

  insert into public.artist_access_grants (
    artist_id,
    grant_type,
    starts_at,
    ends_at,
    lifetime,
    note
  )
  values (
    p_artist_id,
    'self_grace',
    now(),
    ends_at,
    false,
    'Desbloqueio temporario solicitado pelo tatuador - 5 dias'
  );

  update public.artist_profiles
  set plan_status = 'active'
  where id = p_artist_id;

  return ends_at;
end;
$$;

grant execute on function public.claim_artist_monthly_grace(uuid) to authenticated;

notify pgrst, 'reload schema';
