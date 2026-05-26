-- Preserve the CEP-first registration address when the auth trigger creates a new artist.
-- Run after artist-full-address-location.sql.

create or replace function public.create_artist_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  artist_name text := coalesce(nullif(metadata->>'artistic_name', ''), split_part(new.email, '@', 1), 'Artista');
  profile_slug text := public.get_unique_artist_slug(coalesce(nullif(metadata->>'slug', ''), artist_name));
  created_profile_id uuid;
begin
  if coalesce(metadata->>'role', '') <> 'artist' then
    return new;
  end if;

  insert into public.artist_profiles (
    user_id,
    slug,
    artistic_name,
    real_name,
    whatsapp,
    address_street,
    address_number,
    address_complement,
    neighborhood,
    postal_code,
    public_neighborhood,
    public_address_label,
    city,
    state,
    latitude,
    longitude,
    plan_status
  )
  values (
    new.id,
    profile_slug,
    artist_name,
    coalesce(nullif(metadata->>'real_name', ''), artist_name),
    coalesce(metadata->>'whatsapp', ''),
    coalesce(metadata->>'address_street', ''),
    coalesce(metadata->>'address_number', ''),
    coalesce(metadata->>'address_complement', ''),
    coalesce(metadata->>'neighborhood', ''),
    coalesce(metadata->>'postal_code', ''),
    coalesce(metadata->>'public_neighborhood', metadata->>'neighborhood', ''),
    coalesce(metadata->>'public_address_label', ''),
    coalesce(metadata->>'city', ''),
    coalesce(metadata->>'state', ''),
    nullif(metadata->>'latitude', '')::double precision,
    nullif(metadata->>'longitude', '')::double precision,
    'active'
  )
  on conflict (user_id) do nothing
  returning id into created_profile_id;

  if created_profile_id is not null then
    insert into public.artist_pix_settings (
      artist_id,
      pix_key,
      pix_type,
      deposit_value,
      deposit_required
    )
    values (
      created_profile_id,
      '',
      'phone',
      150,
      true
    )
    on conflict (artist_id) do nothing;

    insert into public.artist_access_grants (
      artist_id,
      grant_type,
      starts_at,
      ends_at,
      lifetime,
      note
    )
    values (
      created_profile_id,
      'trial',
      now(),
      now() + interval '7 days',
      false,
      'Teste gratuito inicial de 7 dias'
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.create_artist_profile_for_new_user() from public, anon, authenticated;
