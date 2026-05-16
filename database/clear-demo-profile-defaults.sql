-- Clears demo placeholders accidentally copied into real artist profiles.
-- Run only when you want to reset profiles that still show the old Pexels/mock defaults.

update public.artist_profiles
set
  bio = case
    when bio ilike '%Especialista em Blackwork e Fineline%' then ''
    else bio
  end,
  instagram = case
    when instagram in ('@joaoink.tattoo') then ''
    else instagram
  end,
  avatar_path = case
    when avatar_path ilike '%pexels-photo-7908899%' then ''
    else avatar_path
  end,
  avatar_source = case
    when avatar_path ilike '%pexels-photo-7908899%' then 'upload'
    else avatar_source
  end,
  cover_path = case
    when cover_path ilike '%pexels-photo-35742622%' then ''
    else cover_path
  end,
  cover_source = case
    when cover_path ilike '%pexels-photo-35742622%' then 'upload'
    else cover_source
  end,
  styles = case
    when bio ilike '%Especialista em Blackwork e Fineline%' then '{}'
    else styles
  end
where
  bio ilike '%Especialista em Blackwork e Fineline%'
  or instagram in ('@joaoink.tattoo')
  or avatar_path ilike '%pexels-photo-7908899%'
  or cover_path ilike '%pexels-photo-35742622%';
