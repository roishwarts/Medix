-- v0 patch for projects that already ran schema.sql:
-- a patient may submit an evidence task without a file (so the full flow can be demoed).

create or replace function guard_patient_task_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth_role() is distinct from 'patient' then
    return new;
  end if;

  if (new.journey_id, new.clinic_id, new.title, new.description, new.owner, new.due_offset_days,
      new.requires_evidence, new.requires_review, new.mandatory, new.position, new.depends_on,
      new.review_note, new.reviewed_at, new.reviewed_by)
     is distinct from
     (old.journey_id, old.clinic_id, old.title, old.description, old.owner, old.due_offset_days,
      old.requires_evidence, old.requires_review, old.mandatory, old.position, old.depends_on,
      old.review_note, old.reviewed_at, old.reviewed_by) then
    raise exception 'patients can only submit tasks';
  end if;

  if old.owner <> 'patient' or old.status not in ('pending', 'rejected') then
    raise exception 'task is not open for submission';
  end if;

  if exists (select 1 from journey_tasks d where d.id = any(old.depends_on) and d.status <> 'accepted') then
    raise exception 'task is locked';
  end if;

  if new.status <> (case when old.requires_evidence or old.requires_review then 'submitted' else 'accepted' end) then
    raise exception 'invalid status transition';
  end if;

  return new;
end $$;
