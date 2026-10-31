-- Doctor's private notes on a visit (an appointment-kind journey_task): what was discussed, what's
-- needed next. One note per appointment, kept even if the appointment's own fields change later.
-- Run after patch-calendar.sql. Safe to re-run.

create table if not exists visit_notes (
  id uuid primary key default gen_random_uuid(),
  journey_task_id uuid not null unique references journey_tasks(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table visit_notes enable row level security;

drop policy if exists visit_notes_doctor_select on visit_notes;
create policy visit_notes_doctor_select on visit_notes for select
  using (is_doctor() and clinic_id = auth_clinic());

-- All writes go through save_visit_note(); there is no insert/update/delete policy for anyone,
-- since clinical notes are sensitive and the function alone validates the appointment belongs to
-- the caller's clinic and that the caller is a doctor.

create or replace function save_visit_note(p_task_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
  v_patient uuid;
begin
  if not is_doctor() then raise exception 'not allowed'; end if;

  select j.patient_id into v_patient
  from journey_tasks jt join journeys j on j.id = jt.journey_id
  where jt.id = p_task_id and jt.kind = 'appointment' and jt.clinic_id = v_clinic;
  if v_patient is null then raise exception 'appointment not found'; end if;

  if trim(coalesce(p_note, '')) = '' then
    delete from visit_notes where journey_task_id = p_task_id;
    return;
  end if;

  insert into visit_notes (journey_task_id, patient_id, clinic_id, doctor_id, note)
  values (p_task_id, v_patient, v_clinic, auth.uid(), trim(p_note))
  on conflict (journey_task_id) do update set note = excluded.note, updated_at = now();
end $$;

revoke execute on function save_visit_note(uuid, text) from public, anon;
