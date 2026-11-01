-- Upgrades the old doctor-only, appointment-only visit note into a shared "סיכום פגישה": any staff
-- member (not just the doctor) can write one, it doesn't have to be tied to a pre-scheduled
-- appointment (a phone call works too), and anyone on staff can edit or delete any summary later.
-- Run after patch-visit-notes.sql. Safe to re-run.

alter table visit_notes alter column journey_task_id drop not null;
alter table visit_notes drop constraint if exists visit_notes_journey_task_id_key;
drop index if exists visit_notes_journey_task_id_key;

do $$ begin
  alter table visit_notes rename column doctor_id to author_id;
exception when undefined_column then null; end $$;

alter table visit_notes add column if not exists follow_up text;
alter table visit_notes add column if not exists occurred_at timestamptz not null default now();
alter table visit_notes add column if not exists updated_by uuid references auth.users(id) on delete set null;

create index if not exists visit_notes_occurred on visit_notes(patient_id, occurred_at desc);

-- Open up from doctor-only to all staff.
drop policy if exists visit_notes_doctor_select on visit_notes;
drop policy if exists visit_notes_staff_select on visit_notes;
create policy visit_notes_staff_select on visit_notes for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));

-- p_id null creates a new summary; otherwise updates that one (any staff member, not just its
-- author — a secretary should be able to fix a typo in the doctor's note and vice versa).
-- p_journey_task_id is optional: a summary can stand on its own (a phone call, an unscheduled
-- visit) or be linked to an existing appointment.
create or replace function save_meeting_summary(
  p_id uuid, p_patient_id uuid, p_journey_task_id uuid, p_occurred_at timestamptz, p_note text, p_follow_up text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
  v_id uuid;
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  if trim(coalesce(p_note, '')) = '' then raise exception 'summary text is required'; end if;
  if not exists (select 1 from patients where id = p_patient_id and clinic_id = v_clinic) then
    raise exception 'patient not found';
  end if;
  if p_journey_task_id is not null and not exists (
    select 1 from journey_tasks where id = p_journey_task_id and clinic_id = v_clinic
  ) then
    raise exception 'appointment not found';
  end if;

  if p_id is null then
    insert into visit_notes (patient_id, clinic_id, journey_task_id, occurred_at, author_id, note, follow_up)
    values (p_patient_id, v_clinic, p_journey_task_id, coalesce(p_occurred_at, now()), auth.uid(), trim(p_note), nullif(trim(coalesce(p_follow_up, '')), ''))
    returning id into v_id;
  else
    update visit_notes
    set journey_task_id = p_journey_task_id, occurred_at = coalesce(p_occurred_at, occurred_at),
        note = trim(p_note), follow_up = nullif(trim(coalesce(p_follow_up, '')), ''),
        updated_by = auth.uid(), updated_at = now()
    where id = p_id and patient_id = p_patient_id and clinic_id = v_clinic
    returning id into v_id;
    if v_id is null then raise exception 'summary not found'; end if;
  end if;

  return v_id;
end $$;

revoke execute on function save_meeting_summary(uuid, uuid, uuid, timestamptz, text, text) from public, anon;

create or replace function delete_meeting_summary(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  delete from visit_notes where id = p_id and clinic_id = auth_clinic();
end $$;

revoke execute on function delete_meeting_summary(uuid) from public, anon;
