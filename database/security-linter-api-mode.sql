-- Strict Supabase linter cleanup after moving RPC calls to the private API.
-- Run this only after deploying the API/frontend that use /api/admin, /api/artists
-- and /api/public endpoints instead of direct PostgREST RPC calls.

create schema if not exists private;

create or replace function private.artist_has_active_access(p_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.artist_access_grants g
    where g.artist_id = p_artist_id
      and g.starts_at <= now()
      and (g.lifetime = true or g.ends_at > now())
  );
$$;

grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.artist_has_active_access(uuid) to anon, authenticated, service_role;

-- Backend-only posture: browser clients should not read/write application
-- tables directly. The Node API uses service_role and bypasses RLS.
drop policy if exists "Public can read active artist profiles" on public.artist_profiles;
drop policy if exists "Artists can manage own profile" on public.artist_profiles;
drop policy if exists "No direct client access to artist profiles" on public.artist_profiles;
create policy "No direct client access to artist profiles"
on public.artist_profiles for all
using (false)
with check (false);

drop policy if exists "Public can read pix settings for active profiles" on public.artist_pix_settings;
drop policy if exists "Artists can manage own pix settings" on public.artist_pix_settings;
drop policy if exists "No direct client access to pix settings" on public.artist_pix_settings;
create policy "No direct client access to pix settings"
on public.artist_pix_settings for all
using (false)
with check (false);

drop policy if exists "Admins can read self admin record" on public.platform_admins;
drop policy if exists "No direct client access to platform admins" on public.platform_admins;
create policy "No direct client access to platform admins"
on public.platform_admins for all
using (false)
with check (false);

drop policy if exists "Admins can read access grants" on public.artist_access_grants;
drop policy if exists "No direct client access to access grants" on public.artist_access_grants;
create policy "No direct client access to access grants"
on public.artist_access_grants for all
using (false)
with check (false);

drop policy if exists "Artists can read own platform payments" on public.platform_payments;
drop policy if exists "Admins can read platform payments" on public.platform_payments;
drop policy if exists "No direct client access to platform payments" on public.platform_payments;
create policy "No direct client access to platform payments"
on public.platform_payments for all
using (false)
with check (false);

drop policy if exists "Public can read active profile portfolio" on public.portfolio_photos;
drop policy if exists "Artists can manage own portfolio" on public.portfolio_photos;
drop policy if exists "No direct client access to portfolio" on public.portfolio_photos;
create policy "No direct client access to portfolio"
on public.portfolio_photos for all
using (false)
with check (false);

drop policy if exists "Public can read active profile weekly slots" on public.weekly_slots;
drop policy if exists "Artists can manage own weekly slots" on public.weekly_slots;
drop policy if exists "No direct client access to weekly slots" on public.weekly_slots;
create policy "No direct client access to weekly slots"
on public.weekly_slots for all
using (false)
with check (false);

drop policy if exists "Public can read active profile blocked dates" on public.blocked_dates;
drop policy if exists "Artists can manage own blocked dates" on public.blocked_dates;
drop policy if exists "No direct client access to blocked dates" on public.blocked_dates;
create policy "No direct client access to blocked dates"
on public.blocked_dates for all
using (false)
with check (false);

drop policy if exists "Artists can read own appointments" on public.appointments;
drop policy if exists "Artists can update own appointments" on public.appointments;
drop policy if exists "Public can create appointments for active profiles" on public.appointments;
drop policy if exists "No direct client access to appointments" on public.appointments;
create policy "No direct client access to appointments"
on public.appointments for all
using (false)
with check (false);

drop policy if exists "Public can create files for active appointment artists" on public.appointment_files;
drop policy if exists "Artists can read own appointment files" on public.appointment_files;
drop policy if exists "No direct client access to appointment files" on public.appointment_files;
create policy "No direct client access to appointment files"
on public.appointment_files for all
using (false)
with check (false);

drop policy if exists "Public can read active profile appointment slots" on public.appointment_slots;
drop policy if exists "Artists can manage own appointment slots" on public.appointment_slots;
drop policy if exists "No direct client access to appointment slots" on public.appointment_slots;
create policy "No direct client access to appointment slots"
on public.appointment_slots for all
using (false)
with check (false);

drop policy if exists "No direct client access to artist likes" on public.artist_likes;
create policy "No direct client access to artist likes"
on public.artist_likes for all
using (false)
with check (false);

drop policy if exists "Admins can read platform settings" on public.platform_settings;
drop policy if exists "Admins can update platform settings" on public.platform_settings;
drop policy if exists "No direct client access to platform settings" on public.platform_settings;
create policy "No direct client access to platform settings"
on public.platform_settings for all
using (false)
with check (false);

-- The browser no longer needs to execute these SECURITY DEFINER functions
-- directly. The private API uses service role/direct table operations.
revoke execute on function public.artist_has_active_access(uuid) from public, anon, authenticated;
revoke execute on function public.create_public_appointment(
  uuid, text, text, text, date, time, text, boolean, integer, boolean, boolean, text
) from public, anon, authenticated;
revoke execute on function public.get_public_approved_slots(text) from public, anon, authenticated;
revoke execute on function public.get_public_artist_like_status(uuid, text) from public, anon, authenticated;
revoke execute on function public.toggle_public_artist_like(uuid, text) from public, anon, authenticated;

revoke execute on function public.admin_grant_artist_access(uuid, timestamptz, boolean, text, text) from public, anon, authenticated;
revoke execute on function public.admin_list_artist_accounts() from public, anon, authenticated;
revoke execute on function public.admin_set_artist_blocked(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.admin_sync_artist_plan_statuses() from public, anon, authenticated;
revoke execute on function public.admin_update_platform_monthly_price(integer) from public, anon, authenticated;
revoke execute on function public.can_claim_artist_monthly_grace(uuid) from public, anon, authenticated;
revoke execute on function public.claim_artist_monthly_grace(uuid) from public, anon, authenticated;
revoke execute on function public.get_artist_access_status(uuid) from public, anon, authenticated;
revoke execute on function public.get_platform_billing_settings() from public, anon, authenticated;
revoke execute on function public.is_platform_admin() from public, anon, authenticated;
revoke execute on function public.sync_artist_plan_status(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
