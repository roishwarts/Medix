-- Medix v0 schema. Run once in the Supabase SQL editor on an empty project.
-- Then run seed.sql for demo data.

create extension if not exists pgcrypto;

create type user_role as enum ('patient', 'staff', 'doctor');

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references clinics(id),
  role user_role not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  name text not null,
  procedure text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- due_offset_days: days BEFORE the surgery date (negative = after surgery).
create table template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id) on delete cascade,
  clinic_id uuid not null references clinics(id),
  title text not null,
  description text,
  owner text not null check (owner in ('patient', 'staff', 'doctor')),
  due_offset_days int not null default 0,
  requires_evidence boolean not null default false,
  requires_review boolean not null default false,
  mandatory boolean not null default true,
  position int not null default 0,
  depends_on uuid[] not null default '{}'
);

create table journeys (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  patient_id uuid not null references patients(id) on delete cascade,
  template_id uuid references templates(id) on delete set null,
  template_name text not null,
  surgery_date date not null,
  created_at timestamptz not null default now()
);
create unique index journeys_one_per_patient on journeys(patient_id);

create table journey_tasks (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references journeys(id) on delete cascade,
  clinic_id uuid not null references clinics(id),
  template_task_id uuid,
  title text not null,
  description text,
  owner text not null check (owner in ('patient', 'staff', 'doctor')),
  due_offset_days int not null default 0,
  requires_evidence boolean not null default false,
  requires_review boolean not null default false,
  mandatory boolean not null default true,
  position int not null default 0,
  depends_on uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'submitted', 'accepted', 'rejected')),
  evidence_path text,
  evidence_name text,
  patient_note text,
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
create index journey_tasks_journey on journey_tasks(journey_id);
create index journeys_clinic on journeys(clinic_id);

-- ---------------------------------------------------------------- helpers

create function auth_clinic() returns uuid
language sql stable security definer set search_path = public as $$
  select clinic_id from profiles where id = auth.uid()
$$;

create function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('staff', 'doctor') from profiles where id = auth.uid()), false)
$$;

create function is_doctor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'doctor' from profiles where id = auth.uid()), false)
$$;

create function owns_journey(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from journeys jr join patients p on p.id = jr.patient_id
    where jr.id = j and p.user_id = auth.uid()
  )
$$;

-- Access to an evidence object, by storage path "<journey_id>/<task_id>/<file>".
create function evidence_access(path text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  first_part text := split_part(path, '/', 1);
  j uuid;
begin
  if first_part !~ '^[0-9a-fA-F-]{36}$' then return false; end if;
  j := first_part::uuid;
  if owns_journey(j) then return true; end if;
  return is_staff() and exists (select 1 from journeys where id = j and clinic_id = auth_clinic());
end $$;

-- ---------------------------------------------------------------- RLS

alter table clinics enable row level security;
alter table profiles enable row level security;
alter table patients enable row level security;
alter table templates enable row level security;
alter table template_tasks enable row level security;
alter table journeys enable row level security;
alter table journey_tasks enable row level security;

create policy clinics_read on clinics for select using (id = auth_clinic());

create policy profiles_read on profiles for select
  using (id = auth.uid() or (is_staff() and clinic_id = auth_clinic()));

create policy patients_staff on patients for all
  using (is_staff() and clinic_id = auth_clinic())
  with check (is_staff() and clinic_id = auth_clinic());
create policy patients_self on patients for select using (user_id = auth.uid());

create policy templates_read on templates for select using (is_staff() and clinic_id = auth_clinic());
create policy templates_doctor on templates for all
  using (is_doctor() and clinic_id = auth_clinic())
  with check (is_doctor() and clinic_id = auth_clinic());

create policy template_tasks_read on template_tasks for select using (is_staff() and clinic_id = auth_clinic());
create policy template_tasks_doctor on template_tasks for all
  using (is_doctor() and clinic_id = auth_clinic())
  with check (is_doctor() and clinic_id = auth_clinic());

create policy journeys_staff on journeys for all
  using (is_staff() and clinic_id = auth_clinic())
  with check (is_staff() and clinic_id = auth_clinic());
create policy journeys_self on journeys for select using (owns_journey(id));

create policy journey_tasks_staff_read on journey_tasks for select
  using (is_staff() and clinic_id = auth_clinic());
create policy journey_tasks_staff_update on journey_tasks for update
  using (is_staff() and clinic_id = auth_clinic())
  with check (is_staff() and clinic_id = auth_clinic());
create policy journey_tasks_doctor_write on journey_tasks for all
  using (is_doctor() and clinic_id = auth_clinic())
  with check (is_doctor() and clinic_id = auth_clinic());
create policy journey_tasks_self_read on journey_tasks for select using (owns_journey(journey_id));
create policy journey_tasks_self_update on journey_tasks for update
  using (owns_journey(journey_id))
  with check (owns_journey(journey_id));

-- A patient may only submit their own, unlocked, open tasks. Everything else is frozen.
create function guard_patient_task_update() returns trigger
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

create trigger journey_tasks_patient_guard
  before update on journey_tasks
  for each row execute function guard_patient_task_update();

-- ---------------------------------------------------------------- journeys

create function _start_journey(p_patient uuid, p_template uuid, p_surgery date) returns uuid
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
    due_offset_days, requires_evidence, requires_review, mandatory, position)
  select v_journey, v_clinic, t.id, t.title, t.description, t.owner,
    t.due_offset_days, t.requires_evidence, t.requires_review, t.mandatory, t.position
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

create function start_journey(p_patient uuid, p_template uuid, p_surgery date) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() or not exists (select 1 from patients where id = p_patient and clinic_id = auth_clinic()) then
    raise exception 'not allowed';
  end if;
  return _start_journey(p_patient, p_template, p_surgery);
end $$;

-- ---------------------------------------------------------------- template / journey editing (doctor)
-- p_tasks: [{id, title, description, owner, due_offset_days, requires_evidence, requires_review,
--            mandatory, depends_on: [uuid]}]  (array order = position)

create function save_template(p_id uuid, p_name text, p_procedure text, p_description text, p_tasks jsonb)
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
    requires_evidence, requires_review, mandatory, position, depends_on)
  select (e.value->>'id')::uuid, v_id, v_clinic, e.value->>'title', nullif(e.value->>'description', ''),
    e.value->>'owner', (e.value->>'due_offset_days')::int,
    (e.value->>'requires_evidence')::boolean, (e.value->>'requires_review')::boolean,
    (e.value->>'mandatory')::boolean, (e.ordinality - 1)::int,
    coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(e.value->'depends_on') x), '{}')
  from jsonb_array_elements(p_tasks) with ordinality as e(value, ordinality)
  on conflict (id) do update set
    title = excluded.title, description = excluded.description, owner = excluded.owner,
    due_offset_days = excluded.due_offset_days, requires_evidence = excluded.requires_evidence,
    requires_review = excluded.requires_review, mandatory = excluded.mandatory,
    position = excluded.position, depends_on = excluded.depends_on
  where template_tasks.template_id = excluded.template_id;

  return v_id;
end $$;

-- Edits one patient's journey only. Status / evidence of existing tasks are preserved.
create function save_journey_tasks(p_journey uuid, p_surgery date, p_tasks jsonb)
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
    requires_evidence, requires_review, mandatory, position, depends_on)
  select (e.value->>'id')::uuid, p_journey, v_clinic, e.value->>'title', nullif(e.value->>'description', ''),
    e.value->>'owner', (e.value->>'due_offset_days')::int,
    (e.value->>'requires_evidence')::boolean, (e.value->>'requires_review')::boolean,
    (e.value->>'mandatory')::boolean, (e.ordinality - 1)::int,
    coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(e.value->'depends_on') x), '{}')
  from jsonb_array_elements(p_tasks) with ordinality as e(value, ordinality)
  on conflict (id) do update set
    title = excluded.title, description = excluded.description, owner = excluded.owner,
    due_offset_days = excluded.due_offset_days, requires_evidence = excluded.requires_evidence,
    requires_review = excluded.requires_review, mandatory = excluded.mandatory,
    position = excluded.position, depends_on = excluded.depends_on
  where journey_tasks.journey_id = excluded.journey_id;
end $$;

revoke execute on function _start_journey(uuid, uuid, date) from public, anon, authenticated;
revoke execute on function start_journey(uuid, uuid, date) from public, anon;
revoke execute on function save_template(uuid, text, text, text, jsonb) from public, anon;
revoke execute on function save_journey_tasks(uuid, date, jsonb) from public, anon;

-- ---------------------------------------------------------------- storage (private evidence bucket)

insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false)
on conflict (id) do nothing;

create policy evidence_select on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and evidence_access(name));
create policy evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and evidence_access(name));
