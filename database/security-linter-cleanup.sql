-- Security linter cleanup for Supabase RPC exposure.
-- Run in Supabase SQL Editor.
--
-- What this does:
-- - fixes mutable search_path on helper functions
-- - removes implicit PUBLIC/anon execution from admin and internal functions
-- - keeps public RPCs public only where the product needs anonymous visitors
--
-- Important:
-- Some SECURITY DEFINER warnings can remain by design while the frontend calls
-- authenticated admin/self-service RPCs directly. To remove those completely,
-- move the admin operations behind the private API/service-role backend.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify_artist_slug(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(
    both '-' from regexp_replace(
      regexp_replace(lower(coalesce(value, 'artista')), '[^a-z0-9]+', '-', 'g'),
      '-+',
      '-',
      'g'
    )
  );
$$;

-- Trigger/internal helpers should never be callable through REST.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.slugify_artist_slug(text) from public, anon, authenticated;
revoke execute on function public.get_unique_artist_slug(text) from public, anon, authenticated;
revoke execute on function public.create_artist_profile_for_new_user() from public, anon, authenticated;

-- Admin RPCs: remove implicit anonymous access, keep authenticated access because
-- each function checks public.is_platform_admin() internally.
revoke execute on function public.admin_list_artist_accounts() from public, anon;
revoke execute on function public.admin_set_artist_blocked(uuid, boolean) from public, anon;
revoke execute on function public.admin_grant_artist_access(uuid, timestamptz, boolean, text, text) from public, anon;
revoke execute on function public.admin_sync_artist_plan_statuses() from public, anon;
revoke execute on function public.admin_update_platform_monthly_price(integer) from public, anon;
revoke execute on function public.get_platform_billing_settings() from public, anon;

grant execute on function public.admin_list_artist_accounts() to authenticated;
grant execute on function public.admin_set_artist_blocked(uuid, boolean) to authenticated;
grant execute on function public.admin_grant_artist_access(uuid, timestamptz, boolean, text, text) to authenticated;
grant execute on function public.admin_sync_artist_plan_statuses() to authenticated;
grant execute on function public.admin_update_platform_monthly_price(integer) to authenticated;
grant execute on function public.get_platform_billing_settings() to authenticated;

-- Authenticated artist-only RPCs: remove anonymous access.
revoke execute on function public.get_artist_access_status(uuid) from public, anon;
revoke execute on function public.sync_artist_plan_status(uuid) from public, anon;
revoke execute on function public.can_claim_artist_monthly_grace(uuid) from public, anon;
revoke execute on function public.claim_artist_monthly_grace(uuid) from public, anon;

grant execute on function public.get_artist_access_status(uuid) to authenticated;
grant execute on function public.sync_artist_plan_status(uuid) to authenticated;
grant execute on function public.can_claim_artist_monthly_grace(uuid) to authenticated;
grant execute on function public.claim_artist_monthly_grace(uuid) to authenticated;

-- Monthly price is now read by the private upload/API server with service role.
-- It does not need to be exposed as a browser RPC.
revoke execute on function public.get_platform_monthly_price() from public, anon, authenticated;

-- Public visitor RPCs intentionally stay available to anon/authenticated:
-- - create_public_appointment
-- - get_public_approved_slots
-- - get_public_artist_like_status
-- - toggle_public_artist_like
-- - artist_has_active_access
--
-- They are SECURITY DEFINER because public visitors need limited access through
-- guarded functions/RLS without direct table access.
revoke execute on function public.create_public_appointment(
  uuid, text, text, text, date, time, text, boolean, integer, boolean, boolean, text
) from public;
revoke execute on function public.get_public_approved_slots(text) from public;
revoke execute on function public.get_public_artist_like_status(uuid, text) from public;
revoke execute on function public.toggle_public_artist_like(uuid, text) from public;
revoke execute on function public.artist_has_active_access(uuid) from public;
revoke execute on function public.is_platform_admin() from public, anon;

grant execute on function public.create_public_appointment(
  uuid, text, text, text, date, time, text, boolean, integer, boolean, boolean, text
) to anon, authenticated;
grant execute on function public.get_public_approved_slots(text) to anon, authenticated;
grant execute on function public.get_public_artist_like_status(uuid, text) to anon, authenticated;
grant execute on function public.toggle_public_artist_like(uuid, text) to anon, authenticated;
grant execute on function public.artist_has_active_access(uuid) to anon, authenticated;
grant execute on function public.is_platform_admin() to authenticated;

notify pgrst, 'reload schema';
