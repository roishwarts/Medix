-- "Red flags" — when to call the clinic urgently after surgery. Free text per template, same
-- copy-on-start model as patient_info (supabase/patch-patient-content.sql). Clinical content, so it is
-- written by the clinic itself, never invented by the app. Run after patch-patient-content.sql.
-- Safe to re-run.

alter table templates add column if not exists red_flags text;
alter table journeys add column if not exists red_flags text;

-- Re-defines _start_journey once more (on top of patch-calendar.sql's kind/location and
-- patch-patient-content.sql's patient_info) to also copy red_flags into the new journey.
create or replace function _start_journey(p_patient uuid, p_template uuid, p_surgery date) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid;
  v_name text;
  v_patient_info text;
  v_red_flags text;
  v_journey uuid;
begin
  select clinic_id into v_clinic from patients where id = p_patient;
  select name, patient_info, red_flags into v_name, v_patient_info, v_red_flags
  from templates where id = p_template and clinic_id = v_clinic;
  if v_clinic is null or v_name is null then
    raise exception 'patient or template not found';
  end if;

  insert into journeys (clinic_id, patient_id, template_id, template_name, surgery_date, patient_info, red_flags)
  values (v_clinic, p_patient, p_template, v_name, p_surgery, v_patient_info, v_red_flags)
  returning id into v_journey;

  insert into journey_tasks (journey_id, clinic_id, template_task_id, title, description, owner,
    due_offset_days, requires_evidence, requires_review, mandatory, position, kind, location)
  select v_journey, v_clinic, t.id, t.title, t.description, t.owner,
    t.due_offset_days, t.requires_evidence, t.requires_review, t.mandatory, t.position, t.kind, t.location
  from template_tasks t where t.template_id = p_template;

  update journey_tasks jt
  set depends_on = coalesce((
    select array_agg(m.id) from journey_tasks m
    where m.journey_id = v_journey and m.template_task_id = any(tt.depends_on)
  ), '{}')
  from template_tasks tt
  where tt.id = jt.template_task_id and jt.journey_id = v_journey;

  return v_journey;
end $$;

-- Mirrors save_template_patient_info: doctor and staff may both edit this.
create function save_template_red_flags(p_template uuid, p_red_flags text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update templates set red_flags = nullif(trim(p_red_flags), ''), updated_at = now()
  where id = p_template and clinic_id = auth_clinic();
  if not found then raise exception 'template not found'; end if;
end $$;

revoke execute on function save_template_red_flags(uuid, text) from public, anon;
