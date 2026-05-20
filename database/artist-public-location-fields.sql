-- Public location fields for better discovery labels.
-- Run in Supabase SQL Editor before wiring "Próximo ao Centro" / public address labels.

alter table public.artist_profiles
add column if not exists public_neighborhood text not null default '',
add column if not exists public_address_label text not null default '';

notify pgrst, 'reload schema';
