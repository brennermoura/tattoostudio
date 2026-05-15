-- TatuApp schema
-- Supabase/PostgreSQL stores business data. Files are stored in hosting uploads.

create extension if not exists "pgcrypto";

create table if not exists public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  slug text not null unique,
  artistic_name text not null,
  real_name text not null default '',
  avatar_path text not null default '',
  avatar_source text not null default 'upload' check (avatar_source in ('upload', 'external_url', 'instagram')),
  cover_path text not null default '',
  cover_source text not null default 'upload' check (cover_source in ('upload', 'external_url')),
  bio text not null default '',
  instagram text not null default '',
  whatsapp text not null default '',
  city text not null default '',
  state text not null default '',
  latitude double precision,
  longitude double precision,
  styles text[] not null default '{}',
  accent_color text not null default '#a855f7',
  plan_status text not null default 'active' check (plan_status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artist_profiles
drop constraint if exists artist_profiles_plan_status_check;

alter table public.artist_profiles
add constraint artist_profiles_plan_status_check
check (plan_status in ('active', 'blocked'));

alter table public.artist_profiles
add column if not exists state text not null default '';

alter table public.artist_profiles
add column if not exists latitude double precision;

alter table public.artist_profiles
add column if not exists longitude double precision;

create table if not exists public.artist_pix_settings (
  artist_id uuid primary key references public.artist_profiles(id) on delete cascade,
  pix_key text not null default '',
  pix_type text not null default 'phone' check (pix_type in ('cpf', 'cnpj', 'email', 'phone', 'random')),
  deposit_value integer not null default 150 check (deposit_value >= 0),
  deposit_required boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.artist_access_grants (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  grant_type text not null default 'manual_free' check (grant_type in ('manual_free', 'paid_pix', 'paid_mercado_pago', 'lifetime')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  lifetime boolean not null default false,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (lifetime = true or ends_at is not null)
);

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

create table if not exists public.artist_likes (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  visitor_token text not null,
  created_at timestamptz not null default now(),
  unique (artist_id, visitor_token)
);

create table if not exists public.portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  file_path text not null,
  file_source text not null default 'upload' check (file_source in ('upload', 'external_url', 'instagram')),
  alt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_slots (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  slot_time time not null,
  created_at timestamptz not null default now(),
  unique (artist_id, weekday, slot_time)
);

create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  blocked_date date not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (artist_id, blocked_date)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  client_name text not null,
  client_phone text not null,
  client_email text not null,
  appointment_date date not null,
  appointment_time time not null,
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  deposit_required boolean not null default true,
  deposit_value integer not null default 0 check (deposit_value >= 0),
  deposit_paid boolean not null default false,
  deposit_credit_used boolean not null default false,
  payment_status text not null default 'not_required' check (
    payment_status in ('not_required', 'pending_proof', 'proof_sent', 'checked', 'credited', 'refunded')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists appointments_one_approved_slot
  on public.appointments (artist_id, appointment_date, appointment_time)
  where status = 'approved';

create or replace function public.create_public_appointment(
  p_artist_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_appointment_date date,
  p_appointment_time time,
  p_description text,
  p_deposit_required boolean,
  p_deposit_value integer,
  p_deposit_paid boolean,
  p_deposit_credit_used boolean,
  p_payment_status text
)
returns table (
  id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_weekday integer;
  actual_deposit_required boolean := false;
  actual_deposit_value integer := 0;
  clean_payment_status text := 'not_required';
begin
  if not exists (
    select 1
    from public.artist_profiles p
    where p.id = p_artist_id
      and p.plan_status = 'active'
  ) then
    raise exception 'Perfil indisponivel para agendamento.';
  end if;

  if p_appointment_date < current_date then
    raise exception 'Data de agendamento invalida.';
  end if;

  if exists (
    select 1
    from public.blocked_dates b
    where b.artist_id = p_artist_id
      and b.blocked_date = p_appointment_date
  ) then
    raise exception 'Data bloqueada pelo tatuador.';
  end if;

  appointment_weekday := extract(dow from p_appointment_date)::integer;

  select
    coalesce(s.deposit_required, false),
    coalesce(s.deposit_value, 0)
  into actual_deposit_required, actual_deposit_value
  from public.artist_pix_settings s
  where s.artist_id = p_artist_id;

  actual_deposit_required := coalesce(actual_deposit_required, false);
  actual_deposit_value := coalesce(actual_deposit_value, 0);

  clean_payment_status :=
    case
      when actual_deposit_required = false then 'not_required'
      when p_deposit_credit_used = true then 'credited'
      when p_deposit_paid = true then 'proof_sent'
      else 'pending_proof'
    end;

  if not exists (
    select 1
    from public.weekly_slots s
    where s.artist_id = p_artist_id
      and s.weekday = appointment_weekday
      and s.slot_time = p_appointment_time
  ) then
    raise exception 'Horario indisponivel na agenda do tatuador.';
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.artist_id = p_artist_id
      and a.appointment_date = p_appointment_date
      and a.appointment_time = p_appointment_time
      and a.status = 'approved'
  ) then
    raise exception 'Horario ja confirmado.';
  end if;

  return query
  insert into public.appointments (
    artist_id,
    client_name,
    client_phone,
    client_email,
    appointment_date,
    appointment_time,
    description,
    status,
    deposit_required,
    deposit_value,
    deposit_paid,
    deposit_credit_used,
    payment_status
  )
  values (
    p_artist_id,
    trim(p_client_name),
    trim(p_client_phone),
    trim(p_client_email),
    p_appointment_date,
    p_appointment_time,
    trim(p_description),
    'pending',
    actual_deposit_required,
    actual_deposit_value,
    case
      when actual_deposit_required = false then false
      else p_deposit_paid
    end,
    case
      when actual_deposit_required = false then false
      else p_deposit_credit_used
    end,
    clean_payment_status
  )
  returning appointments.id, appointments.created_at;
end;
$$;

grant execute on function public.create_public_appointment(
  uuid,
  text,
  text,
  text,
  date,
  time,
  text,
  boolean,
  integer,
  boolean,
  boolean,
  text
) to anon, authenticated;

create table if not exists public.appointment_files (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  file_type text not null check (file_type in ('pix_proof', 'reference')),
  original_name text not null default '',
  internal_name text not null,
  file_path text not null,
  mime_type text not null default '',
  file_size integer not null default 0 check (file_size >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.get_public_approved_slots(profile_slug text)
returns table (
  appointment_date date,
  appointment_time time
)
language sql
stable
security definer
set search_path = public
as $$
  select a.appointment_date, a.appointment_time
  from public.appointments a
  join public.artist_profiles p on p.id = a.artist_id
  where p.slug = profile_slug
    and p.plan_status = 'active'
    and a.status = 'approved';
$$;

grant execute on function public.get_public_approved_slots(text) to anon, authenticated;

create or replace function public.get_public_artist_like_status(
  p_artist_id uuid,
  p_visitor_token text default ''
)
returns table (
  like_count integer,
  viewer_liked boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*)::integer
      from public.artist_likes l
      where l.artist_id = p_artist_id
    ) as like_count,
    exists (
      select 1
      from public.artist_likes l
      where l.artist_id = p_artist_id
        and l.visitor_token = coalesce(nullif(trim(p_visitor_token), ''), 'anon')
    ) as viewer_liked
  from public.artist_profiles p
  where p.id = p_artist_id
    and p.plan_status = 'active';
$$;

grant execute on function public.get_public_artist_like_status(uuid, text) to anon, authenticated;

create or replace function public.toggle_public_artist_like(
  p_artist_id uuid,
  p_visitor_token text
)
returns table (
  like_count integer,
  viewer_liked boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_token text := left(coalesce(nullif(trim(p_visitor_token), ''), 'anon'), 120);
begin
  if not exists (
    select 1
    from public.artist_profiles p
    where p.id = p_artist_id
      and p.plan_status = 'active'
  ) then
    raise exception 'Perfil indisponivel para curtidas.';
  end if;

  if exists (
    select 1
    from public.artist_likes l
    where l.artist_id = p_artist_id
      and l.visitor_token = clean_token
  ) then
    delete from public.artist_likes l
    where l.artist_id = p_artist_id
      and l.visitor_token = clean_token;
  else
    insert into public.artist_likes (artist_id, visitor_token)
    values (p_artist_id, clean_token)
    on conflict (artist_id, visitor_token) do nothing;
  end if;

  return query
  select *
  from public.get_public_artist_like_status(p_artist_id, clean_token);
end;
$$;

grant execute on function public.toggle_public_artist_like(uuid, text) to anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins a
    where a.user_id = auth.uid()
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.get_artist_access_status(p_artist_id uuid)
returns table (
  has_access boolean,
  access_until timestamptz,
  lifetime boolean,
  source text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.artist_profiles p
    where p.id = p_artist_id
      and (p.user_id = auth.uid() or public.is_platform_admin())
  ) then
    raise exception 'Acesso negado.';
  end if;

  return query
  with active_grants as (
    select g.*
    from public.artist_access_grants g
    where g.artist_id = p_artist_id
      and g.starts_at <= now()
      and (g.lifetime = true or g.ends_at > now())
    order by g.lifetime desc, g.ends_at desc nulls last, g.created_at desc
    limit 1
  )
  select
    exists (select 1 from active_grants) as has_access,
    (select g.ends_at from active_grants g limit 1) as access_until,
    coalesce((select g.lifetime from active_grants g limit 1), false) as lifetime,
    coalesce((select g.grant_type from active_grants g limit 1), 'none') as source;
end;
$$;

grant execute on function public.get_artist_access_status(uuid) to authenticated;

drop function if exists public.admin_list_artist_accounts();

create or replace function public.admin_list_artist_accounts()
returns table (
  artist_id uuid,
  user_id uuid,
  email text,
  slug text,
  artistic_name text,
  real_name text,
  instagram text,
  whatsapp text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  plan_status text,
  created_at timestamptz,
  access_until timestamptz,
  access_lifetime boolean,
  access_source text,
  latest_grant_note text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas administradores podem acessar.';
  end if;

  return query
  select
    p.id as artist_id,
    p.user_id,
    coalesce(u.email, '') as email,
    p.slug,
    p.artistic_name,
    p.real_name,
    p.instagram,
    p.whatsapp,
    p.city,
    p.state,
    p.latitude,
    p.longitude,
    p.plan_status,
    p.created_at,
    g.ends_at as access_until,
    coalesce(g.lifetime, false) as access_lifetime,
    coalesce(g.grant_type, 'none') as access_source,
    coalesce(g.note, '') as latest_grant_note
  from public.artist_profiles p
  left join auth.users u on u.id = p.user_id
  left join lateral (
    select access_grant.ends_at, access_grant.lifetime, access_grant.grant_type, access_grant.note
    from public.artist_access_grants access_grant
    where access_grant.artist_id = p.id
      and access_grant.starts_at <= now()
      and (access_grant.lifetime = true or access_grant.ends_at > now())
    order by access_grant.lifetime desc, access_grant.ends_at desc nulls last, access_grant.created_at desc
    limit 1
  ) g on true
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_artist_accounts() to authenticated;

drop function if exists public.admin_grant_artist_access(uuid, timestamptz, boolean, text);
drop function if exists public.admin_grant_artist_access(uuid, timestamptz, boolean, text, text);

create or replace function public.admin_grant_artist_access(
  p_artist_id uuid,
  p_ends_at timestamptz,
  p_lifetime boolean,
  p_note text default '',
  p_grant_type text default 'manual_free'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas administradores podem liberar acesso.';
  end if;

  if coalesce(p_lifetime, false) = false and p_ends_at is null then
    raise exception 'Informe uma data final ou marque acesso vitalicio.';
  end if;

  if coalesce(p_grant_type, 'manual_free') not in ('manual_free', 'paid_pix', 'paid_mercado_pago', 'lifetime') then
    raise exception 'Tipo de liberacao invalido.';
  end if;

  insert into public.artist_access_grants (
    artist_id,
    grant_type,
    ends_at,
    lifetime,
    note,
    created_by
  )
  values (
    p_artist_id,
    case
      when coalesce(p_lifetime, false) then 'lifetime'
      else coalesce(p_grant_type, 'manual_free')
    end,
    case when coalesce(p_lifetime, false) then null else p_ends_at end,
    coalesce(p_lifetime, false),
    coalesce(p_note, ''),
    auth.uid()
  )
  returning id into created_id;

  return created_id;
end;
$$;

grant execute on function public.admin_grant_artist_access(uuid, timestamptz, boolean, text, text) to authenticated;

create or replace function public.admin_set_artist_blocked(
  p_artist_id uuid,
  p_blocked boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas administradores podem bloquear perfis.';
  end if;

  update public.artist_profiles
  set plan_status = case when coalesce(p_blocked, false) then 'blocked' else 'active' end
  where id = p_artist_id;
end;
$$;

grant execute on function public.admin_set_artist_blocked(uuid, boolean) to authenticated;

create or replace function public.slugify_artist_slug(value text)
returns text
language sql
immutable
as $$
  select trim(
    both '-' from regexp_replace(
      regexp_replace(lower(coalesce(value, 'artista')), '[^a-z0-9]+', '-', 'g'),
      '-+',
      '-',
      'g'
    )
  );
$$;

create or replace function public.get_unique_artist_slug(base_slug text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  clean_base text := coalesce(nullif(public.slugify_artist_slug(base_slug), ''), 'artista');
  candidate text := clean_base;
  counter integer := 1;
begin
  while exists (select 1 from public.artist_profiles where slug = candidate) loop
    counter := counter + 1;
    candidate := clean_base || '-' || counter::text;
  end loop;

  return candidate;
end;
$$;

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
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_artist_profile on auth.users;
create trigger on_auth_user_created_create_artist_profile
after insert on auth.users
for each row execute function public.create_artist_profile_for_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists artist_profiles_set_updated_at on public.artist_profiles;
create trigger artist_profiles_set_updated_at
before update on public.artist_profiles
for each row execute function public.set_updated_at();

drop trigger if exists artist_pix_settings_set_updated_at on public.artist_pix_settings;
create trigger artist_pix_settings_set_updated_at
before update on public.artist_pix_settings
for each row execute function public.set_updated_at();

drop trigger if exists platform_payments_set_updated_at on public.platform_payments;
create trigger platform_payments_set_updated_at
before update on public.platform_payments
for each row execute function public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

alter table public.artist_profiles enable row level security;
alter table public.artist_pix_settings enable row level security;
alter table public.platform_admins enable row level security;
alter table public.artist_access_grants enable row level security;
alter table public.platform_payments enable row level security;
alter table public.artist_likes enable row level security;
alter table public.portfolio_photos enable row level security;
alter table public.weekly_slots enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_files enable row level security;

drop policy if exists "Public can read active artist profiles" on public.artist_profiles;
create policy "Public can read active artist profiles"
on public.artist_profiles for select
using (plan_status = 'active');

drop policy if exists "Artists can manage own profile" on public.artist_profiles;
create policy "Artists can manage own profile"
on public.artist_profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Public can read pix settings for active profiles" on public.artist_pix_settings;
create policy "Public can read pix settings for active profiles"
on public.artist_pix_settings for select
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.plan_status = 'active'
  )
);

drop policy if exists "Artists can manage own pix settings" on public.artist_pix_settings;
create policy "Artists can manage own pix settings"
on public.artist_pix_settings for all
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
);

drop policy if exists "Admins can read self admin record" on public.platform_admins;
create policy "Admins can read self admin record"
on public.platform_admins for select
using (auth.uid() = user_id);

drop policy if exists "Admins can read access grants" on public.artist_access_grants;
create policy "Admins can read access grants"
on public.artist_access_grants for select
using (public.is_platform_admin());

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

drop policy if exists "Public can read active profile portfolio" on public.portfolio_photos;
create policy "Public can read active profile portfolio"
on public.portfolio_photos for select
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.plan_status = 'active'
  )
);

drop policy if exists "Artists can manage own portfolio" on public.portfolio_photos;
create policy "Artists can manage own portfolio"
on public.portfolio_photos for all
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
);

drop policy if exists "Public can read active profile weekly slots" on public.weekly_slots;
create policy "Public can read active profile weekly slots"
on public.weekly_slots for select
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.plan_status = 'active'
  )
);

drop policy if exists "Artists can manage own weekly slots" on public.weekly_slots;
create policy "Artists can manage own weekly slots"
on public.weekly_slots for all
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
);

drop policy if exists "Public can read active profile blocked dates" on public.blocked_dates;
create policy "Public can read active profile blocked dates"
on public.blocked_dates for select
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.plan_status = 'active'
  )
);

drop policy if exists "Artists can manage own blocked dates" on public.blocked_dates;
create policy "Artists can manage own blocked dates"
on public.blocked_dates for all
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
);

drop policy if exists "Public can create appointments for active profiles" on public.appointments;

drop policy if exists "Artists can read own appointments" on public.appointments;
create policy "Artists can read own appointments"
on public.appointments for select
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
);

drop policy if exists "Artists can update own appointments" on public.appointments;
create policy "Artists can update own appointments"
on public.appointments for update
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
);

drop policy if exists "Public can create files for active appointment artists" on public.appointment_files;
create policy "Public can create files for active appointment artists"
on public.appointment_files for insert
with check (
  exists (
    select 1 from public.artist_profiles p
    join public.appointments a on a.artist_id = p.id
    where p.id = artist_id
      and a.id = appointment_id
      and p.plan_status = 'active'
  )
);

drop policy if exists "Artists can read own appointment files" on public.appointment_files;
create policy "Artists can read own appointment files"
on public.appointment_files for select
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id and p.user_id = auth.uid()
  )
);
