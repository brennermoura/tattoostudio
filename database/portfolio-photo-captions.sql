-- Optional captions for portfolio photos.
-- Run in Supabase SQL Editor.

alter table public.portfolio_photos
add column if not exists caption text not null default '';

notify pgrst, 'reload schema';
