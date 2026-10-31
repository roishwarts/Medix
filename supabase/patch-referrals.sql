-- Referral letters: a doctor writes one from the system (instead of a stamped paper form) and
-- prints it on a letterhead built from the clinic's own logo/address/phone. Kept per patient as a
-- record of what was issued and when, and can be reprinted later.
-- Run after patch-clinic-logo.sql and patch-location.sql. Safe to re-run.

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete set null,
  doctor_name text not null,
  recipient text not null,
  reason text not null,
  body text,
  created_at timestamptz not null default now()
);

alter table referrals enable row level security;

drop policy if exists referrals_staff_select on referrals;
create policy referrals_staff_select on referrals for select
  using (is_staff() and clinic_id = auth_clinic());

create or replace function save_referral(p_patient uuid, p_recipient text, p_reason text, p_body text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
  v_name text;
  v_id uuid;
begin
  if not is_doctor() then raise exception 'not allowed'; end if;
  if not exists (select 1 from patients where id = p_patient and clinic_id = v_clinic) then
    raise exception 'patient not found';
  end if;
  if trim(coalesce(p_recipient, '')) = '' or trim(coalesce(p_reason, '')) = '' then
    raise exception 'recipient and reason are required';
  end if;

  select full_name into v_name from profiles where id = auth.uid();

  insert into referrals (patient_id, clinic_id, doctor_id, doctor_name, recipient, reason, body)
  values (p_patient, v_clinic, auth.uid(), coalesce(v_name, ''), trim(p_recipient), trim(p_reason), nullif(trim(coalesce(p_body, '')), ''))
  returning id into v_id;

  return v_id;
end $$;

revoke execute on function save_referral(uuid, text, text, text) from public, anon;
