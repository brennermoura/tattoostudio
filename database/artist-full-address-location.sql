-- Full studio address for reliable geolocation.
-- Run in Supabase SQL Editor before deploying address-based location fields.

alter table public.artist_profiles
add column if not exists address_street text not null default '',
add column if not exists address_number text not null default '',
add column if not exists address_complement text not null default '',
add column if not exists neighborhood text not null default '',
add column if not exists postal_code text not null default '',
add column if not exists public_neighborhood text not null default '',
add column if not exists public_address_label text not null default '';

notify pgrst, 'reload schema';
