-- Staff (secretary) can edit a patient's journey like the doctor does.
-- Run after patch-calendar.sql. Safe to run more than once.

create or replace function save_journey_tasks(p_journey uuid, p_surgery date, p_tasks jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
begin
  if not is_staff() or not exists (select 1 from journeys where id = p_journey and clinic_id = v_clinic) then
    raise exception 'not allowed';
  end if;

  update journeys set surgery_date = p_surgery where id = p_journey;

  delete from journey_tasks
  where journey_id = p_journey and id not in (select (e->>'id')::uuid from jsonb_array_elements(p_tasks) e);

  insert into journey_tasks (id, journey_id, clinic_id, title, description, owner, due_offset_days,
    requires_evidence, requires_review, mandatory, position, depends_on, kind, location, scheduled_at)
  select (e.value->>'id')::uuid, p_journey, v_clinic, e.value->>'title', nullif(e.value->>'description', ''),
    e.value->>'owner', (e.value->>'due_offset_days')::int,
    (e.value->>'requires_evidence')::boolean, (e.value->>'requires_review')::boolean,
    (e.value->>'mandatory')::boolean, (e.ordinality - 1)::int,
    coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(e.value->'depends_on') x), '{}'),
    coalesce(nullif(e.value->>'kind', ''), 'task'), nullif(e.value->>'location', ''),
    nullif(e.value->>'scheduled_at', '')::timestamptz
  from jsonb_array_elements(p_tasks) with ordinality as e(value, ordinality)
  on conflict (id) do update set
    title = excluded.title, description = excluded.description, owner = excluded.owner,
    due_offset_days = excluded.due_offset_days, requires_evidence = excluded.requires_evidence,
    requires_review = excluded.requires_review, mandatory = excluded.mandatory,
    position = excluded.position, depends_on = excluded.depends_on,
    kind = excluded.kind, location = excluded.location, scheduled_at = excluded.scheduled_at
  where journey_tasks.journey_id = excluded.journey_id;
end $$;
