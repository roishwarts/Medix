-- Caregiver patch. Run after schema.sql, seed.sql and patch-calendar.sql. Safe to run more than once.
-- Patients invite family members with a single-use link; caregivers see the patient's journey
-- and, if allowed, can submit tasks on the patient's behalf.

alter type user_role add value if not exists 'caregiver';

alter table journey_tasks add column if not exists submitted_by uuid;
alter table journey_tasks drop constraint if exists journey_tasks_submitted_by_fkey;
alter table journey_tasks add constraint journey_tasks_submitted_by_fkey
  foreign key (submitted_by) references auth.users(id) on delete set null;

create table if not exists patient_caregivers (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  patient_id uuid not null references patients(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  relation text not null,
  can_act boolean not null default true,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists patient_caregivers_patient on patient_caregivers(patient_id);

-- Invites hold only a hash of the token; the link itself is shown to the patient once.
create table if not exists caregiver_invites (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  patient_id uuid not null references patients(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  relation text not null,
  can_act boolean not null default true,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists caregiver_invites_patient on caregiver_invites(patient_id);

-- ---------------------------------------------------------------- helpers

create or replace function owns_patient(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from patients where id = p and user_id = auth.uid())
$$;

create or replace function is_caregiver_of(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from patient_caregivers where patient_id = p and user_id = auth.uid())
$$;

-- A journey is accessible to its patient and to the patient's caregivers.
create or replace function owns_journey(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from journeys jr join patients p on p.id = jr.patient_id
    where jr.id = j and (
      p.user_id = auth.uid()
      or exists (select 1 from patient_caregivers c where c.patient_id = p.id and c.user_id = auth.uid())
    )
  )
$$;

-- ---------------------------------------------------------------- RLS

alter table patient_caregivers enable row level security;
alter table caregiver_invites enable row level security;

drop policy if exists pc_staff on patient_caregivers;
create policy pc_staff on patient_caregivers for select
  using (is_staff() and clinic_id = auth_clinic());
drop policy if exists pc_patient on patient_caregivers;
create policy pc_patient on patient_caregivers for select using (owns_patient(patient_id));
drop policy if exists pc_self on patient_caregivers;
create policy pc_self on patient_caregivers for select using (user_id = auth.uid());

drop policy if exists inv_patient_select on caregiver_invites;
create policy inv_patient_select on caregiver_invites for select using (created_by = auth.uid());
drop policy if exists inv_patient_insert on caregiver_invites;
create policy inv_patient_insert on caregiver_invites for insert
  with check (created_by = auth.uid() and owns_patient(patient_id) and clinic_id = auth_clinic());
drop policy if exists inv_patient_delete on caregiver_invites;
create policy inv_patient_delete on caregiver_invites for delete using (created_by = auth.uid());
drop policy if exists inv_staff_select on caregiver_invites;
create policy inv_staff_select on caregiver_invites for select
  using (is_staff() and clinic_id = auth_clinic());

drop policy if exists patients_caregiver on patients;
create policy patients_caregiver on patients for select using (is_caregiver_of(id));

-- ---------------------------------------------------------------- patient / caregiver submit guard

create or replace function guard_patient_task_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := auth_role()::text;
begin
  if v_role is null or v_role not in ('patient', 'caregiver') then
    return new;
  end if;

  if v_role = 'caregiver' and not exists (
    select 1 from patient_caregivers c join journeys j on j.patient_id = c.patient_id
    where c.user_id = auth.uid() and c.can_act and j.id = old.journey_id
  ) then
    raise exception 'caregiver is view-only';
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

  new.submitted_by := auth.uid();
  return new;
end $$;
