-- Date-specific appointment slots for TatuApp.
-- Run in Supabase SQL Editor.
--
-- Fixes the old weekly behavior where selecting one Sunday opened every Sunday.

create table if not exists public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  slot_date date not null,
  slot_time time not null,
  created_at timestamptz not null default now(),
  unique (artist_id, slot_date, slot_time)
);

create index if not exists appointment_slots_artist_date_idx
  on public.appointment_slots (artist_id, slot_date, slot_time);

alter table public.appointment_slots enable row level security;

drop policy if exists "Public can read active profile appointment slots" on public.appointment_slots;
create policy "Public can read active profile appointment slots"
on public.appointment_slots for select
using (
  exists (
    select 1 from public.artist_profiles p
    where p.id = artist_id
      and p.plan_status = 'active'
      and public.artist_has_active_access(p.id)
  )
);

drop policy if exists "Artists can manage own appointment slots" on public.appointment_slots;
create policy "Artists can manage own appointment slots"
on public.appointment_slots for all
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
  has_date_slots boolean := false;
begin
  if not exists (
    select 1
    from public.artist_profiles p
    where p.id = p_artist_id
      and p.plan_status = 'active'
      and public.artist_has_active_access(p.id)
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

  select exists (
    select 1
    from public.appointment_slots s
    where s.artist_id = p_artist_id
  ) into has_date_slots;

  if has_date_slots then
    if not exists (
      select 1
      from public.appointment_slots s
      where s.artist_id = p_artist_id
        and s.slot_date = p_appointment_date
        and s.slot_time = p_appointment_time
    ) then
      raise exception 'Horario indisponivel na agenda do tatuador.';
    end if;
  else
    if not exists (
      select 1
      from public.weekly_slots s
      where s.artist_id = p_artist_id
        and s.weekday = appointment_weekday
        and s.slot_time = p_appointment_time
    ) then
      raise exception 'Horario indisponivel na agenda do tatuador.';
    end if;
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
  uuid, text, text, text, date, time, text, boolean, integer, boolean, boolean, text
) to anon, authenticated;

notify pgrst, 'reload schema';
