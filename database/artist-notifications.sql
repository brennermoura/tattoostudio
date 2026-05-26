-- Internal inbox for artist activity and support messages.
-- Run in Supabase SQL Editor before testing dashboard notifications.

create table if not exists public.artist_notifications (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  type text not null check (type in ('like', 'appointment', 'support', 'billing')),
  title text not null,
  message text not null default '',
  action text not null default '' check (action in ('', 'profile', 'appointments', 'payments')),
  action_ref text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists artist_notifications_artist_created_idx
  on public.artist_notifications (artist_id, created_at desc);

alter table public.artist_notifications enable row level security;

drop policy if exists "No direct client access to artist notifications" on public.artist_notifications;
create policy "No direct client access to artist notifications"
on public.artist_notifications for all
using (false)
with check (false);

revoke all on public.artist_notifications from anon, authenticated;
grant all on public.artist_notifications to service_role;

notify pgrst, 'reload schema';
