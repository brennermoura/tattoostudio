-- Mercado Pago billing patch for TatuApp
-- Run this in Supabase SQL Editor before testing checkout/webhooks.

alter table public.artist_access_grants
drop constraint if exists artist_access_grants_grant_type_check;

alter table public.artist_access_grants
add constraint artist_access_grants_grant_type_check
check (grant_type in ('manual_free', 'paid_pix', 'paid_mercado_pago', 'lifetime'));

create table if not exists public.platform_payments (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  provider text not null default 'mercado_pago' check (provider in ('mercado_pago')),
  external_reference text not null unique,
  provider_preference_id text not null default '',
  provider_payment_id text not null default '',
  status text not null default 'pending' check (
    status in ('pending', 'in_process', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back')
  ),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'BRL',
  checkout_url text not null default '',
  sandbox_checkout_url text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_payments_artist_created_idx
  on public.platform_payments (artist_id, created_at desc);

create index if not exists platform_payments_provider_payment_idx
  on public.platform_payments (provider_payment_id)
  where provider_payment_id <> '';

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

drop trigger if exists platform_payments_set_updated_at on public.platform_payments;
create trigger platform_payments_set_updated_at
before update on public.platform_payments
for each row execute function public.set_updated_at();

alter table public.platform_payments enable row level security;

drop policy if exists "Artists can read own platform payments" on public.platform_payments;
create policy "Artists can read own platform payments"
on public.platform_payments for select
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
);

drop policy if exists "Admins can read platform payments" on public.platform_payments;
create policy "Admins can read platform payments"
on public.platform_payments for select
using (public.is_platform_admin());

notify pgrst, 'reload schema';
