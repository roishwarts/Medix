-- Activity feed patch. Run after the other patches. Safe to run more than once.
-- Records what happens to each patient (automatically, at the database level) for the "עדכונים" page.

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  journey_id uuid references journeys(id) on delete cascade,
  task_id uuid,
  kind text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_role text,
  subject text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists activity_events_clinic on activity_events(clinic_id, created_at desc);
create index if not exists activity_events_patient on activity_events(patient_id, created_at desc);
alter table activity_events enable row level security;

drop policy if exists activity_staff_read on activity_events;
create policy activity_staff_read on activity_events for select
  using (is_staff() and clinic_id = auth_clinic());

-- when each staff member last opened the feed (for the "new" badge)
create table if not exists activity_seen (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table activity_seen enable row level security;
drop policy if exists activity_seen_own on activity_seen;
create policy activity_seen_own on activity_seen for all
  using (user_id = auth.uid() and is_staff())
  with check (user_id = auth.uid() and is_staff());

-- ---------------------------------------------------------------- recording helper

create or replace function _log_activity(
  p_clinic uuid, p_patient uuid, p_journey uuid, p_task uuid, p_kind text, p_actor uuid, p_subject text, p_detail text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_role text;
begin
  if p_actor is not null then
    select full_name, role::text into v_name, v_role from profiles where id = p_actor;
  end if;
  insert into activity_events (clinic_id, patient_id, journey_id, task_id, kind, actor_id, actor_name, actor_role, subject, detail)
  values (p_clinic, p_patient, p_journey, p_task, p_kind, p_actor, v_name, v_role, p_subject, p_detail);
end $$;
revoke execute on function _log_activity(uuid, uuid, uuid, uuid, text, uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- task changes
-- Changes made from SQL scripts (no signed-in user) are not recorded.

create or replace function trg_task_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_patient uuid;
  v_role text;
  v_kind text;
begin
  if v_actor is null then return new; end if;
  select patient_id into v_patient from journeys where id = new.journey_id;
  select role::text into v_role from profiles where id = v_actor;

  if new.status is distinct from old.status then
    if new.status = 'submitted' then v_kind := 'task_submitted';
    elsif new.status = 'accepted' then
      v_kind := case when old.status = 'submitted' and v_role in ('staff', 'doctor') then 'task_accepted' else 'task_completed' end;
    elsif new.status = 'rejected' then v_kind := 'task_rejected';
    elsif new.status = 'pending' then v_kind := 'task_reopened';
    end if;
    if v_kind is not null then
      perform _log_activity(new.clinic_id, v_patient, new.journey_id, new.id, v_kind, v_actor, new.title,
        case when v_kind = 'task_rejected' then new.review_note end);
    end if;
  end if;

  if new.kind = 'appointment' and new.scheduled_at is not null and new.scheduled_at is distinct from old.scheduled_at then
    perform _log_activity(new.clinic_id, v_patient, new.journey_id, new.id, 'appointment_scheduled', v_actor, new.title,
      to_char(new.scheduled_at at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI'));
  end if;
  return new;
end $$;

drop trigger if exists journey_tasks_activity on journey_tasks;
create trigger journey_tasks_activity after update on journey_tasks
  for each row execute function trg_task_activity();

-- ---------------------------------------------------------------- patients

create or replace function trg_patient_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_journey uuid;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      perform _log_activity(new.clinic_id, new.id, null, null, 'patient_created', auth.uid(), new.full_name, null);
    end if;
  elsif old.user_id is null and new.user_id is not null then
    select id into v_journey from journeys where patient_id = new.id;
    perform _log_activity(new.clinic_id, new.id, v_journey, null, 'patient_joined', new.user_id, new.full_name, null);
  end if;
  return new;
end $$;

drop trigger if exists patients_activity on patients;
create trigger patients_activity after insert or update on patients
  for each row execute function trg_patient_activity();

-- ---------------------------------------------------------------- family

create or replace function trg_caregiver_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_journey uuid;
begin
  if tg_op = 'INSERT' then
    select id into v_journey from journeys where patient_id = new.patient_id;
    perform _log_activity(new.clinic_id, new.patient_id, v_journey, null, 'caregiver_joined', new.user_id, new.full_name, new.relation);
    return new;
  end if;
  select id into v_journey from journeys where patient_id = old.patient_id;
  perform _log_activity(old.clinic_id, old.patient_id, v_journey, null, 'caregiver_removed', auth.uid(), old.full_name, old.relation);
  return old;
end $$;

drop trigger if exists patient_caregivers_activity on patient_caregivers;
create trigger patient_caregivers_activity after insert or delete on patient_caregivers
  for each row execute function trg_caregiver_activity();

create or replace function trg_invite_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_journey uuid;
begin
  select id into v_journey from journeys where patient_id = new.patient_id;
  perform _log_activity(new.clinic_id, new.patient_id, v_journey, null, 'caregiver_invited', new.created_by, new.invitee_name, new.relation);
  return new;
end $$;

drop trigger if exists caregiver_invites_activity on caregiver_invites;
create trigger caregiver_invites_activity after insert on caregiver_invites
  for each row execute function trg_invite_activity();

-- ---------------------------------------------------------------- password resets

create or replace function trg_reset_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_patient uuid;
  v_journey uuid;
begin
  select id into v_patient from patients where user_id = new.user_id;
  if v_patient is null then
    select patient_id into v_patient from patient_caregivers where user_id = new.user_id;
  end if;
  select id into v_journey from journeys where patient_id = v_patient;

  if tg_op = 'INSERT' then
    perform _log_activity(new.clinic_id, v_patient, v_journey, null, 'reset_requested', new.user_id, new.full_name, null);
  elsif old.handled_at is null and new.handled_at is not null then
    perform _log_activity(new.clinic_id, v_patient, v_journey, null, 'reset_link_sent', new.handled_by, new.full_name, null);
  end if;
  return new;
end $$;

drop trigger if exists password_reset_requests_activity on password_reset_requests;
create trigger password_reset_requests_activity after insert or update on password_reset_requests
  for each row execute function trg_reset_activity();

-- ---------------------------------------------------------------- journey edits (secretary or doctor)

create or replace function save_journey_tasks(p_journey uuid, p_surgery date, p_tasks jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
  v_patient uuid;
begin
  if not is_staff() or not exists (select 1 from journeys where id = p_journey and clinic_id = v_clinic) then
    raise exception 'not allowed';
  end if;

  update journeys set surgery_date = p_surgery where id = p_journey returning patient_id into v_patient;

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

  perform _log_activity(v_clinic, v_patient, p_journey, null, 'journey_edited', auth.uid(), null, null);
end $$;
