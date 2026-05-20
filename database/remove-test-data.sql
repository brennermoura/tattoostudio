-- Removes seeded/demo/test data from Supabase.
-- Run this in Supabase SQL Editor when you want the app to show only real users.
--
-- It removes:
-- - auth users created by the local seed script: teste.*@tatuapp.local
-- - artist profiles with seeded test slugs
-- - old demo Pexels/mock placeholders that leaked into real profiles

delete from auth.users
where email ilike 'teste.%@tatuapp.local';

delete from public.artist_profiles
where slug in (
  'teste-pago',
  'teste-inadimplente',
  'teste-bloqueado',
  'teste-rio',
  'teste-bh',
  'teste-curitiba',
  'teste-floripa',
  'teste-poa'
)
or slug ilike 'teste-%'
or bio ilike '%Perfil fantasma para testar%'
or bio ilike '%Especialista em Blackwork e Fineline%'
or instagram in ('@joaoink.tattoo')
or avatar_path ilike '%pexels-photo-7908899%'
or cover_path ilike '%pexels-photo-35742622%';

notify pgrst, 'reload schema';
