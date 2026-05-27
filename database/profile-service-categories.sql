-- Profile type and service categories for tattoo artists, body piercers and studios.
-- Run in Supabase SQL Editor before deploying the matching frontend/API changes.

alter table public.artist_profiles
add column if not exists profile_type text not null default 'professional',
add column if not exists service_categories text[] not null default array['tattoo']::text[];

alter table public.artist_profiles
drop constraint if exists artist_profiles_profile_type_check;

alter table public.artist_profiles
add constraint artist_profiles_profile_type_check
check (profile_type in ('professional', 'studio'));

alter table public.artist_profiles
drop constraint if exists artist_profiles_service_categories_check;

alter table public.artist_profiles
add constraint artist_profiles_service_categories_check
check (
  cardinality(service_categories) > 0
  and service_categories <@ array['tattoo', 'piercing']::text[]
);

alter table public.appointments
add column if not exists service_category text not null default 'tattoo';

alter table public.appointments
drop constraint if exists appointments_service_category_check;

alter table public.appointments
add constraint appointments_service_category_check
check (service_category in ('tattoo', 'piercing'));

update public.artist_profiles
set profile_type = 'professional'
where profile_type is null or profile_type not in ('professional', 'studio');

update public.artist_profiles
set service_categories = array['tattoo']::text[]
where service_categories is null
  or cardinality(service_categories) = 0
  or not (service_categories <@ array['tattoo', 'piercing']::text[]);

update public.appointments
set service_category = 'tattoo'
where service_category is null or service_category not in ('tattoo', 'piercing');

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
  metadata_services text[] := coalesce(
    array(
      select distinct service.value
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(metadata->'service_categories') = 'array'
            then metadata->'service_categories'
          else '["tattoo"]'::jsonb
        end
      ) as service(value)
      where service.value in ('tattoo', 'piercing')
    ),
    array[]::text[]
  );
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
    profile_type,
    service_categories,
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
    case
      when metadata->>'profile_type' in ('professional', 'studio') then metadata->>'profile_type'
      else 'professional'
    end,
    coalesce(nullif(metadata_services, array[]::text[]), array['tattoo']::text[]),
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

create or replace function public.save_artist_settings_transactional(
  p_artist_id uuid,
  p_profile jsonb,
  p_pix jsonb,
  p_weekly_slots jsonb,
  p_date_slots jsonb,
  p_blocked_dates jsonb,
  p_portfolio jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_services text[] := coalesce(
    array(
      select distinct service.value
      from jsonb_array_elements_text(coalesce(p_profile->'service_categories', '[]'::jsonb)) as service(value)
      where service.value in ('tattoo', 'piercing')
    ),
    array[]::text[]
  );
begin
  update public.artist_profiles
  set slug = p_profile->>'slug',
      artistic_name = p_profile->>'artistic_name',
      real_name = p_profile->>'real_name',
      bio = coalesce(p_profile->>'bio', ''),
      instagram = coalesce(p_profile->>'instagram', ''),
      whatsapp = coalesce(p_profile->>'whatsapp', ''),
      profile_type = case
        when p_profile->>'profile_type' in ('professional', 'studio') then p_profile->>'profile_type'
        else 'professional'
      end,
      service_categories = coalesce(nullif(profile_services, array[]::text[]), array['tattoo']::text[]),
      address_street = coalesce(p_profile->>'address_street', ''),
      address_number = coalesce(p_profile->>'address_number', ''),
      address_complement = coalesce(p_profile->>'address_complement', ''),
      neighborhood = coalesce(p_profile->>'neighborhood', ''),
      postal_code = coalesce(p_profile->>'postal_code', ''),
      public_neighborhood = coalesce(p_profile->>'public_neighborhood', ''),
      public_address_label = coalesce(p_profile->>'public_address_label', ''),
      city = coalesce(p_profile->>'city', ''),
      state = coalesce(p_profile->>'state', ''),
      latitude = nullif(p_profile->>'latitude', '')::double precision,
      longitude = nullif(p_profile->>'longitude', '')::double precision,
      styles = coalesce(
        array(select jsonb_array_elements_text(coalesce(p_profile->'styles', '[]'::jsonb))),
        '{}'::text[]
      ),
      accent_color = coalesce(p_profile->>'accent_color', '#a855f7'),
      avatar_path = coalesce(p_profile->>'avatar_path', avatar_path),
      avatar_source = coalesce(p_profile->>'avatar_source', avatar_source),
      cover_path = coalesce(p_profile->>'cover_path', cover_path),
      cover_source = coalesce(p_profile->>'cover_source', cover_source),
      cover_position_x = coalesce(nullif(p_profile->>'cover_position_x', '')::smallint, cover_position_x),
      cover_position_y = coalesce(nullif(p_profile->>'cover_position_y', '')::smallint, cover_position_y)
  where id = p_artist_id;

  if not found then
    raise exception 'Perfil nao encontrado.';
  end if;

  insert into public.artist_pix_settings (
    artist_id,
    pix_key,
    pix_type,
    deposit_value,
    deposit_required
  )
  values (
    p_artist_id,
    coalesce(p_pix->>'pix_key', ''),
    coalesce(p_pix->>'pix_type', 'phone'),
    coalesce(nullif(p_pix->>'deposit_value', '')::integer, 0),
    coalesce((p_pix->>'deposit_required')::boolean, true)
  )
  on conflict (artist_id) do update
  set pix_key = excluded.pix_key,
      pix_type = excluded.pix_type,
      deposit_value = excluded.deposit_value,
      deposit_required = excluded.deposit_required;

  delete from public.weekly_slots where artist_id = p_artist_id;
  insert into public.weekly_slots (artist_id, weekday, slot_time)
  select p_artist_id, slot.weekday, slot.slot_time::time
  from jsonb_to_recordset(coalesce(p_weekly_slots, '[]'::jsonb))
    as slot(weekday integer, slot_time text);

  delete from public.appointment_slots where artist_id = p_artist_id;
  insert into public.appointment_slots (artist_id, slot_date, slot_time)
  select p_artist_id, slot.slot_date::date, slot.slot_time::time
  from jsonb_to_recordset(coalesce(p_date_slots, '[]'::jsonb))
    as slot(slot_date text, slot_time text);

  delete from public.blocked_dates where artist_id = p_artist_id;
  insert into public.blocked_dates (artist_id, blocked_date)
  select p_artist_id, blocked.blocked_date::date
  from jsonb_to_recordset(coalesce(p_blocked_dates, '[]'::jsonb))
    as blocked(blocked_date text);

  update public.portfolio_photos photo
  set caption = data.caption,
      alt = data.alt,
      sort_order = data.sort_order
  from jsonb_to_recordset(coalesce(p_portfolio, '[]'::jsonb))
    as data(id uuid, caption text, alt text, sort_order integer)
  where photo.id = data.id
    and photo.artist_id = p_artist_id;
end;
$$;

revoke execute on function public.save_artist_settings_transactional(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.save_artist_settings_transactional(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to service_role;

create or replace function public.list_public_artists_for_api(p_visitor_token text default '')
returns table (
  id uuid,
  slug text,
  artistic_name text,
  avatar_path text,
  cover_path text,
  bio text,
  instagram text,
  profile_type text,
  service_categories text[],
  public_neighborhood text,
  public_address_label text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  styles text[],
  accent_color text,
  created_at timestamptz,
  like_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile.id,
    profile.slug,
    profile.artistic_name,
    profile.avatar_path,
    profile.cover_path,
    profile.bio,
    profile.instagram,
    profile.profile_type,
    profile.service_categories,
    profile.public_neighborhood,
    profile.public_address_label,
    profile.city,
    profile.state,
    round(profile.latitude::numeric, 2)::double precision,
    round(profile.longitude::numeric, 2)::double precision,
    profile.styles,
    profile.accent_color,
    profile.created_at,
    count(liked.id) as like_count
  from public.artist_profiles profile
  left join public.artist_likes liked on liked.artist_id = profile.id
  where profile.plan_status = 'active'
    and exists (
      select 1
      from public.artist_access_grants grant_row
      where grant_row.artist_id = profile.id
        and grant_row.starts_at <= now()
        and (grant_row.lifetime = true or grant_row.ends_at > now())
    )
  group by profile.id
  order by profile.created_at desc
  limit 80;
$$;

revoke execute on function public.list_public_artists_for_api(text) from public, anon, authenticated;
grant execute on function public.list_public_artists_for_api(text) to service_role;

notify pgrst, 'reload schema';
