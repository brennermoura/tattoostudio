-- Adjustable public cover framing.
-- Run in Supabase SQL Editor before using "Ajustar capa".

alter table public.artist_profiles
add column if not exists cover_position_x smallint not null default 50
  check (cover_position_x between 0 and 100),
add column if not exists cover_position_y smallint not null default 50
  check (cover_position_y between 0 and 100);

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
begin
  update public.artist_profiles
  set slug = p_profile->>'slug',
      artistic_name = p_profile->>'artistic_name',
      real_name = p_profile->>'real_name',
      bio = coalesce(p_profile->>'bio', ''),
      instagram = coalesce(p_profile->>'instagram', ''),
      whatsapp = coalesce(p_profile->>'whatsapp', ''),
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

notify pgrst, 'reload schema';
