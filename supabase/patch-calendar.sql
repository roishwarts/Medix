-- Calendar patch. Run after schema.sql (and seed.sql). Safe to run more than once.
-- Adds appointments (kind, location, scheduled_at) and a demo pre-op clinic visit.

alter table template_tasks add column if not exists kind text not null default 'task';
alter table template_tasks add column if not exists location text;
alter table journey_tasks add column if not exists kind text not null default 'task';
alter table journey_tasks add column if not exists location text;
alter table journey_tasks add column if not exists scheduled_at timestamptz;

do $$ begin
  alter table template_tasks add constraint template_tasks_kind_check check (kind in ('task', 'appointment'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table journey_tasks add constraint journey_tasks_kind_check check (kind in ('task', 'appointment'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- functions

create or replace function guard_patient_task_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth_role() is distinct from 'patient' then
    return new;
  end if;

  if (new.journey_id, new.clinic_id, new.title, new.description, new.owner, new.due_offset_days,
      new.requires_evidence, new.requires_review, new.mandatory, new.position, new.depends_on,
      new.review_note, new.reviewed_at, new.reviewed_by, new.kind, new.location, new.scheduled_at)
     is distinct from
     (old.journey_id, old.clinic_id, old.title, old.description, old.owner, old.due_offset_days,
      old.requires_evidence, old.requires_review, old.mandatory, old.position, old.depends_on,
      old.review_note, old.reviewed_at, old.reviewed_by, old.kind, old.location, old.scheduled_at) then
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

create or replace function _start_journey(p_patient uuid, p_template uuid, p_surgery date) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid;
  v_name text;
  v_journey uuid;
begin
  select clinic_id into v_clinic from patients where id = p_patient;
  select name into v_name from templates where id = p_template and clinic_id = v_clinic;
  if v_clinic is null or v_name is null then
    raise exception 'patient or template not found';
  end if;

  insert into journeys (clinic_id, patient_id, template_id, template_name, surgery_date)
  values (v_clinic, p_patient, p_template, v_name, p_surgery)
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

create or replace function save_template(p_id uuid, p_name text, p_procedure text, p_description text, p_tasks jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
  v_id uuid;
begin
  if not is_doctor() then raise exception 'not allowed'; end if;

  if p_id is null then
    insert into templates (clinic_id, name, procedure, description)
    values (v_clinic, p_name, p_procedure, p_description) returning id into v_id;
  else
    update templates set name = p_name, procedure = p_procedure, description = p_description, updated_at = now()
    where id = p_id and clinic_id = v_clinic returning id into v_id;
    if v_id is null then raise exception 'template not found'; end if;
  end if;

  delete from template_tasks
  where template_id = v_id and id not in (select (e->>'id')::uuid from jsonb_array_elements(p_tasks) e);

  insert into template_tasks (id, template_id, clinic_id, title, description, owner, due_offset_days,
    requires_evidence, requires_review, mandatory, position, depends_on, kind, location)
  select (e.value->>'id')::uuid, v_id, v_clinic, e.value->>'title', nullif(e.value->>'description', ''),
    e.value->>'owner', (e.value->>'due_offset_days')::int,
    (e.value->>'requires_evidence')::boolean, (e.value->>'requires_review')::boolean,
    (e.value->>'mandatory')::boolean, (e.ordinality - 1)::int,
    coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(e.value->'depends_on') x), '{}'),
    coalesce(nullif(e.value->>'kind', ''), 'task'), nullif(e.value->>'location', '')
  from jsonb_array_elements(p_tasks) with ordinality as e(value, ordinality)
  on conflict (id) do update set
    title = excluded.title, description = excluded.description, owner = excluded.owner,
    due_offset_days = excluded.due_offset_days, requires_evidence = excluded.requires_evidence,
    requires_review = excluded.requires_review, mandatory = excluded.mandatory,
    position = excluded.position, depends_on = excluded.depends_on,
    kind = excluded.kind, location = excluded.location
  where template_tasks.template_id = excluded.template_id;

  return v_id;
end $$;

create or replace function save_journey_tasks(p_journey uuid, p_surgery date, p_tasks jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
begin
  if not is_doctor() or not exists (select 1 from journeys where id = p_journey and clinic_id = v_clinic) then
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

-- ---------------------------------------------------------------- demo data: pre-op clinic visit
-- Adds an appointment to the demo knee template and to its existing journeys (skipped if already there).

do $$
declare
  t record;
  j record;
  v_consult uuid;
  v_sign uuid;
  v_new uuid;
  v_jc uuid;
  v_jnew uuid;
  v_sched timestamptz;
  v_done boolean;
begin
  for t in select id, clinic_id from templates where name like 'החלפת ברך%' loop
    if exists (select 1 from template_tasks where template_id = t.id and kind = 'appointment') then
      continue;
    end if;
    select id into v_consult from template_tasks where template_id = t.id and title = 'פגישת ייעוץ והחלטה על ניתוח';
    select id into v_sign from template_tasks where template_id = t.id and title = 'אישור סופי לניתוח';

    insert into template_tasks (template_id, clinic_id, title, description, owner, due_offset_days,
      requires_evidence, requires_review, mandatory, position, depends_on, kind, location)
    values (t.id, t.clinic_id, 'ביקור קדם-ניתוחי במרפאה',
      'פגישה במרפאה לבדיקה אחרונה והסבר על הניתוח. יש להגיע עם רשימת התרופות.',
      'staff', 12, false, false, true, 14,
      case when v_consult is null then '{}'::uuid[] else array[v_consult] end, 'appointment', 'המרפאה')
    returning id into v_new;

    update template_tasks set depends_on = depends_on || v_new where id = v_sign;

    for j in select id, clinic_id, surgery_date from journeys where template_id = t.id loop
      select id into v_jc from journey_tasks where journey_id = j.id and template_task_id = v_consult;
      v_sched := ((j.surgery_date - 12)::timestamp + time '10:00') at time zone 'Asia/Jerusalem';
      -- already signed off (or visit in the past) means the visit happened
      v_done := v_sched < now() or exists (
        select 1 from journey_tasks where journey_id = j.id and template_task_id = v_sign and status = 'accepted');

      insert into journey_tasks (journey_id, clinic_id, template_task_id, title, description, owner,
        due_offset_days, requires_evidence, requires_review, mandatory, position, depends_on,
        kind, location, scheduled_at, status, reviewed_at)
      values (j.id, j.clinic_id, v_new, 'ביקור קדם-ניתוחי במרפאה',
        'פגישה במרפאה לבדיקה אחרונה והסבר על הניתוח. יש להגיע עם רשימת התרופות.',
        'staff', 12, false, false, true, 14,
        case when v_jc is null then '{}'::uuid[] else array[v_jc] end,
        'appointment', 'המרפאה', v_sched,
        case when v_done then 'accepted' else 'pending' end,
        case when v_done then least(v_sched, now()) else null end)
      returning id into v_jnew;

      update journey_tasks set depends_on = depends_on || v_jnew
      where journey_id = j.id and template_task_id = v_sign;
    end loop;
  end loop;
end $$;
