-- Security fixes for public booking proof uploads and InfinitePay confirmation.
-- Run in Supabase SQL Editor after infinitepay-subscriptions-access.sql
-- and date-specific-appointment-slots.sql.
-- The API must be deployed with the matching booking/payment changes first.

alter table public.appointments
add column if not exists proof_upload_token_hash text,
add column if not exists proof_upload_token_expires_at timestamptz,
add column if not exists proof_uploaded_at timestamptz,
add column if not exists proof_reviewed_at timestamptz,
add column if not exists proof_reviewed_by uuid references auth.users(id) on delete set null,
add column if not exists proof_rejection_reason text not null default '';

alter table public.appointments
drop constraint if exists appointments_payment_status_check;

update public.appointments
set payment_status = 'paid_confirmed'
where payment_status = 'checked'
  and deposit_paid = true;

update public.appointments
set payment_status = 'pending_proof',
    deposit_paid = false
where payment_status = 'checked'
  and deposit_paid = false;

alter table public.appointments
add constraint appointments_payment_status_check
check (
  payment_status in (
    'not_required',
    'pending_proof',
    'proof_sent',
    'proof_rejected',
    'paid_confirmed',
    'credited',
    'refunded'
  )
);

alter table public.artist_access_grants
add column if not exists payment_id uuid references public.platform_payments(id) on delete set null;

create unique index if not exists artist_access_grants_payment_unique_idx
  on public.artist_access_grants (payment_id)
  where payment_id is not null;

create unique index if not exists platform_payments_provider_payment_unique_idx
  on public.platform_payments (provider, provider_payment_id)
  where provider_payment_id <> '';

create table if not exists public.geocode_cache (
  query_hash text primary key,
  query_text text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

alter table public.geocode_cache enable row level security;
drop policy if exists "No direct client access to geocode cache" on public.geocode_cache;
create policy "No direct client access to geocode cache"
on public.geocode_cache for all
using (false)
with check (false);
revoke all on public.geocode_cache from anon, authenticated;
grant all on public.geocode_cache to service_role;

create or replace function public.approve_infinitepay_payment_once(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_invoice_slug text,
  p_amount_cents integer,
  p_payload jsonb,
  p_checkout_url text default ''
)
returns table (
  approved boolean,
  artist_id uuid,
  grant_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  local_payment public.platform_payments%rowtype;
  latest_access_end timestamptz;
  new_grant_id uuid;
  access_starts_at timestamptz := now();
  access_ends_at timestamptz;
begin
  select payment.*
  into local_payment
  from public.platform_payments payment
  where payment.id = p_payment_id
  for update;

  if local_payment.id is null or local_payment.provider <> 'infinitepay' then
    raise exception 'Pagamento InfinitePay nao encontrado.';
  end if;

  if local_payment.status = 'approved' then
    return query select false, local_payment.artist_id, null::uuid;
    return;
  end if;

  if coalesce(p_provider_payment_id, '') = '' then
    raise exception 'Transacao InfinitePay ausente.';
  end if;

  if p_amount_cents < local_payment.amount_cents then
    raise exception 'Valor pago inferior ao esperado.';
  end if;

  if local_payment.provider_preference_id not in ('', 'infinitepay-checkout-api', p_invoice_slug) then
    raise exception 'Cobranca InfinitePay nao corresponde ao pagamento.';
  end if;

  update public.platform_payments
  set provider_payment_id = p_provider_payment_id,
      provider_preference_id = coalesce(nullif(p_invoice_slug, ''), provider_preference_id),
      status = 'approved',
      amount_cents = p_amount_cents,
      currency = 'BRL',
      checkout_url = coalesce(nullif(p_checkout_url, ''), checkout_url),
      raw_payload = coalesce(p_payload, '{}'::jsonb),
      paid_at = now()
  where id = local_payment.id;

  select max(access_grant.ends_at)
  into latest_access_end
  from public.artist_access_grants access_grant
  where access_grant.artist_id = local_payment.artist_id
    and access_grant.lifetime = false
    and access_grant.ends_at > access_starts_at;

  access_ends_at := greatest(coalesce(latest_access_end, access_starts_at), access_starts_at) + interval '30 days';

  insert into public.artist_access_grants (
    artist_id,
    grant_type,
    starts_at,
    ends_at,
    lifetime,
    note,
    payment_id
  )
  values (
    local_payment.artist_id,
    'paid_infinitepay',
    access_starts_at,
    access_ends_at,
    false,
    'InfinitePay confirmado - ' || p_provider_payment_id,
    local_payment.id
  )
  returning id into new_grant_id;

  update public.artist_profiles
  set plan_status = 'active'
  where id = local_payment.artist_id;

  return query select true, local_payment.artist_id, new_grant_id;
end;
$$;

revoke execute on function public.approve_infinitepay_payment_once(
  uuid, text, text, integer, jsonb, text
) from public, anon, authenticated;

grant execute on function public.approve_infinitepay_payment_once(
  uuid, text, text, integer, jsonb, text
) to service_role;

create or replace function public.record_appointment_proof_upload(
  p_appointment_id uuid,
  p_artist_id uuid,
  p_token_hash text,
  p_original_name text,
  p_internal_name text,
  p_file_path text,
  p_mime_type text,
  p_file_size integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  file_id uuid;
begin
  update public.appointments
  set payment_status = 'proof_sent',
      deposit_paid = false,
      proof_uploaded_at = now(),
      proof_rejection_reason = ''
  where id = p_appointment_id
    and artist_id = p_artist_id
    and deposit_required = true
    and payment_status in ('pending_proof', 'proof_rejected')
    and proof_upload_token_hash = p_token_hash
    and proof_upload_token_expires_at > now();

  if not found then
    raise exception 'Comprovante nao autorizado ou reserva ja atualizada.';
  end if;

  insert into public.appointment_files (
    appointment_id,
    artist_id,
    file_type,
    original_name,
    internal_name,
    file_path,
    mime_type,
    file_size
  )
  values (
    p_appointment_id,
    p_artist_id,
    'pix_proof',
    p_original_name,
    p_internal_name,
    p_file_path,
    p_mime_type,
    p_file_size
  )
  returning id into file_id;

  return file_id;
end;
$$;

revoke execute on function public.record_appointment_proof_upload(
  uuid, uuid, text, text, text, text, text, integer
) from public, anon, authenticated;

grant execute on function public.record_appointment_proof_upload(
  uuid, uuid, text, text, text, text, text, integer
) to service_role;

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
      cover_source = coalesce(p_profile->>'cover_source', cover_source)
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
