-- Two doctor-facing features:
--  1. "Questions for the doctor": any staff member (secretary or doctor) sends a patient to the doctor
--     with a question; the doctor sees a queue and answers it; everyone on staff sees the answer.
--  2. A clinical summary per journey (diagnosis, side, allergies, medications, history, notes) shown first
--     on the patient card. Kept in its own staff-only table so a patient can never read it through
--     their own journey row. Only the doctor edits it.
-- Run after patch-outcomes.sql. Safe to re-run.

-- ---------------------------------------------------------------- questions for the doctor

create table if not exists doctor_questions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  journey_id uuid references journeys(id) on delete set null,
  question text not null,
  urgent boolean not null default false,
  asked_by uuid references auth.users(id) on delete set null,
  asked_at timestamptz not null default now(),
  answer text,
  answered_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz
);
create index if not exists doctor_questions_clinic_open on doctor_questions(clinic_id, answered_at);
create index if not exists doctor_questions_patient on doctor_questions(patient_id);

alter table doctor_questions enable row level security;
drop policy if exists doctor_questions_staff_select on doctor_questions;
create policy doctor_questions_staff_select on doctor_questions for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));

-- All writes go through these functions: no insert/update/delete policy exists for anyone.
create or replace function ask_doctor(p_patient uuid, p_journey uuid, p_question text, p_urgent boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
  v_id uuid;
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  if trim(coalesce(p_question, '')) = '' then raise exception 'question is required'; end if;
  if not exists (select 1 from patients where id = p_patient and clinic_id = v_clinic) then
    raise exception 'patient not found';
  end if;
  insert into doctor_questions (clinic_id, patient_id, journey_id, question, urgent, asked_by)
  values (v_clinic, p_patient, p_journey, trim(p_question), coalesce(p_urgent, false), auth.uid())
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function ask_doctor(uuid, uuid, text, boolean) from public, anon;

create or replace function answer_doctor_question(p_id uuid, p_answer text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_doctor() then raise exception 'not allowed'; end if;
  if trim(coalesce(p_answer, '')) = '' then raise exception 'answer is required'; end if;
  update doctor_questions
  set answer = trim(p_answer), answered_by = auth.uid(), answered_at = now()
  where id = p_id and clinic_id = auth_clinic();
  if not found then raise exception 'question not found'; end if;
end $$;
revoke execute on function answer_doctor_question(uuid, text) from public, anon;

-- Take back a question that is still unanswered (asked by mistake). The doctor may also clear any.
create or replace function withdraw_doctor_question(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  delete from doctor_questions
  where id = p_id and clinic_id = auth_clinic() and answered_at is null
    and (asked_by = auth.uid() or is_doctor());
end $$;
revoke execute on function withdraw_doctor_question(uuid) from public, anon;

-- ---------------------------------------------------------------- clinical summary

create table if not exists clinical_summaries (
  journey_id uuid primary key references journeys(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  diagnosis text,
  side text check (side is null or side in ('left', 'right', 'both')),
  allergies text,
  medications text,
  medical_history text,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists clinical_summaries_clinic on clinical_summaries(clinic_id);

alter table clinical_summaries enable row level security;
drop policy if exists clinical_summaries_staff_select on clinical_summaries;
create policy clinical_summaries_staff_select on clinical_summaries for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));

create or replace function save_clinical_summary(
  p_journey uuid, p_diagnosis text, p_side text, p_allergies text, p_medications text, p_history text, p_notes text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
begin
  if not is_doctor() then raise exception 'not allowed'; end if;
  if not exists (select 1 from journeys where id = p_journey and clinic_id = v_clinic) then
    raise exception 'journey not found';
  end if;
  insert into clinical_summaries (journey_id, clinic_id, diagnosis, side, allergies, medications, medical_history, notes, updated_by)
  values (p_journey, v_clinic, nullif(trim(coalesce(p_diagnosis, '')), ''), nullif(p_side, ''),
    nullif(trim(coalesce(p_allergies, '')), ''), nullif(trim(coalesce(p_medications, '')), ''),
    nullif(trim(coalesce(p_history, '')), ''), nullif(trim(coalesce(p_notes, '')), ''), auth.uid())
  on conflict (journey_id) do update set
    diagnosis = excluded.diagnosis, side = excluded.side, allergies = excluded.allergies,
    medications = excluded.medications, medical_history = excluded.medical_history, notes = excluded.notes,
    updated_by = auth.uid(), updated_at = now();
end $$;
revoke execute on function save_clinical_summary(uuid, text, text, text, text, text, text) from public, anon;
