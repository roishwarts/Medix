-- PROMs (Patient-Reported Outcome Measures): a generic health questionnaire (structured like the
-- EQ-5D-5L) plus a procedure-specific one (structured like the Oxford Knee Score, knee only for now),
-- collected before surgery and again at 3 months and 1 year after. Reuses the existing task/journey
-- machinery — each timepoint is a journey_task (kind = 'proms', owner = 'patient') that the patient
-- fills from their own task page, same as any other task.
--
-- IMPORTANT — licensing: the question wording used here (lib/proms.ts, not this file) is a faithful
-- RESTRUCTURING of the public domain-describable shape of these instruments (same dimensions, same
-- response scale, same timing), written in-house in Hebrew. It is NOT the officially licensed
-- translation. EQ-5D-5L's approved wording is licensed by EuroQol; the Oxford Knee Score's by Oxford
-- University Innovation. Before relying on these scores for real clinical research or cross-study
-- comparison, get the licensed Hebrew wording from the rights holder and swap it into lib/proms.ts —
-- the scoring and plumbing here don't change either way.
--
-- Run after patch-outcomes.sql. Safe to re-run.

do $$ begin
  alter table template_tasks drop constraint template_tasks_kind_check;
  alter table template_tasks add constraint template_tasks_kind_check check (kind in ('task', 'appointment', 'proms'));
exception when undefined_object then
  alter table template_tasks add constraint template_tasks_kind_check check (kind in ('task', 'appointment', 'proms'));
end $$;
do $$ begin
  alter table journey_tasks drop constraint journey_tasks_kind_check;
  alter table journey_tasks add constraint journey_tasks_kind_check check (kind in ('task', 'appointment', 'proms'));
exception when undefined_object then
  alter table journey_tasks add constraint journey_tasks_kind_check check (kind in ('task', 'appointment', 'proms'));
end $$;

alter table template_tasks add column if not exists proms_instrument text;
alter table template_tasks add column if not exists proms_timepoint text;
alter table journey_tasks add column if not exists proms_instrument text;
alter table journey_tasks add column if not exists proms_timepoint text;

do $$ begin
  alter table template_tasks add constraint template_tasks_proms_check check (
    proms_instrument is null or proms_instrument in ('eq5d5l', 'oks')
  );
exception when duplicate_object then null; end $$;
do $$ begin
  alter table template_tasks add constraint template_tasks_proms_timepoint_check check (
    proms_timepoint is null or proms_timepoint in ('baseline', 'month3', 'year1')
  );
exception when duplicate_object then null; end $$;
do $$ begin
  alter table journey_tasks add constraint journey_tasks_proms_check check (
    proms_instrument is null or proms_instrument in ('eq5d5l', 'oks')
  );
exception when duplicate_object then null; end $$;
do $$ begin
  alter table journey_tasks add constraint journey_tasks_proms_timepoint_check check (
    proms_timepoint is null or proms_timepoint in ('baseline', 'month3', 'year1')
  );
exception when duplicate_object then null; end $$;

create table if not exists proms_responses (
  id uuid primary key default gen_random_uuid(),
  journey_task_id uuid not null unique references journey_tasks(id) on delete cascade,
  journey_id uuid not null references journeys(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  instrument text not null check (instrument in ('eq5d5l', 'oks')),
  timepoint text not null check (timepoint in ('baseline', 'month3', 'year1')),
  answers jsonb not null,
  score int,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now()
);
create index if not exists proms_responses_journey on proms_responses(journey_id);
create index if not exists proms_responses_patient on proms_responses(patient_id);
create index if not exists proms_responses_clinic on proms_responses(clinic_id);

alter table proms_responses enable row level security;

drop policy if exists proms_responses_staff_select on proms_responses;
create policy proms_responses_staff_select on proms_responses for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists proms_responses_self_select on proms_responses;
create policy proms_responses_self_select on proms_responses for select
  using ((select owns_journey(journey_id)));

-- All writes go through submit_proms(): it computes the score server-side (so a patient can't post
-- an arbitrary score) and marks the task accepted in the same transaction. No insert/update policy
-- exists for anyone — the function (security definer) is the only way in.

create or replace function submit_proms(p_task_id uuid, p_answers jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_task journey_tasks%rowtype;
  v_score int;
  i int;
  v_val int;
begin
  select * into v_task from journey_tasks where id = p_task_id;
  if v_task.id is null or v_task.kind <> 'proms' or v_task.proms_instrument is null then
    raise exception 'questionnaire task not found';
  end if;
  if not (select owns_journey(v_task.journey_id)) then
    raise exception 'not allowed';
  end if;
  if v_task.status not in ('pending', 'rejected') then
    raise exception 'already submitted';
  end if;

  if v_task.proms_instrument = 'oks' then
    -- Oxford Knee Score: 12 items, each 0 (worst) to 4 (best); total 0-48, higher is better.
    v_score := 0;
    for i in 1..12 loop
      v_val := (p_answers ->> ('q' || i))::int;
      if v_val is null or v_val < 0 or v_val > 4 then raise exception 'invalid answer for q%', i; end if;
      v_score := v_score + v_val;
    end loop;
  elsif v_task.proms_instrument = 'eq5d5l' then
    -- EQ-5D-5L: 5 dimensions (1-5 each, stored as-is in answers, no licensed index computed here —
    -- see the file header) plus a 0-100 VAS "health today" score, which is what we store as the score.
    v_score := (p_answers ->> 'vas')::int;
    if v_score is null or v_score < 0 or v_score > 100 then raise exception 'invalid vas score'; end if;
    for i in 1..5 loop
      v_val := (p_answers ->> ('d' || i))::int;
      if v_val is null or v_val < 1 or v_val > 5 then raise exception 'invalid answer for d%', i; end if;
    end loop;
  end if;

  insert into proms_responses (journey_task_id, journey_id, patient_id, clinic_id, instrument, timepoint, answers, score, submitted_by)
  values (p_task_id, v_task.journey_id, (select patient_id from journeys where id = v_task.journey_id), v_task.clinic_id,
    v_task.proms_instrument, v_task.proms_timepoint, p_answers, v_score, auth.uid());

  -- Goes through the normal patient-submission path (same columns the guard trigger allows a
  -- patient/caregiver to change), so a caregiver with can_act may also submit on the patient's behalf,
  -- same as any other task.
  update journey_tasks set status = 'accepted', submitted_at = now() where id = p_task_id;
end $$;

revoke execute on function submit_proms(uuid, jsonb) from public, anon;

-- ---------------------------------------------------------------- carry proms_instrument/timepoint through template copy and journey start

create or replace function _copy_template(p_src uuid, p_clinic uuid, p_base boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_new uuid;
begin
  insert into templates (clinic_id, is_base, name, procedure, description)
  select p_clinic, p_base, name, procedure, description from templates where id = p_src
  returning id into v_new;
  if v_new is null then raise exception 'template not found'; end if;

  with src as materialized (
    select t.*, gen_random_uuid() as new_id from template_tasks t where t.template_id = p_src
  )
  insert into template_tasks (id, template_id, clinic_id, title, description, owner, due_offset_days,
    requires_evidence, requires_review, mandatory, position, depends_on, kind, location, proms_instrument, proms_timepoint)
  select s.new_id, v_new, p_clinic, s.title, s.description, s.owner, s.due_offset_days,
    s.requires_evidence, s.requires_review, s.mandatory, s.position,
    coalesce((select array_agg(d.new_id) from src d where d.id = any(s.depends_on)), '{}'),
    s.kind, s.location, s.proms_instrument, s.proms_timepoint
  from src s;

  return v_new;
end $$;

create or replace function _start_journey(p_patient uuid, p_template uuid, p_surgery date) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid;
  v_name text;
  v_patient_info text;
  v_journey uuid;
begin
  select clinic_id into v_clinic from patients where id = p_patient;
  select name, patient_info into v_name, v_patient_info from templates where id = p_template and clinic_id = v_clinic;
  if v_clinic is null or v_name is null then
    raise exception 'patient or template not found';
  end if;

  insert into journeys (clinic_id, patient_id, template_id, template_name, surgery_date, patient_info)
  values (v_clinic, p_patient, p_template, v_name, p_surgery, v_patient_info)
  returning id into v_journey;

  insert into journey_tasks (journey_id, clinic_id, template_task_id, title, description, owner,
    due_offset_days, requires_evidence, requires_review, mandatory, position, kind, location, proms_instrument, proms_timepoint)
  select v_journey, v_clinic, t.id, t.title, t.description, t.owner,
    t.due_offset_days, t.requires_evidence, t.requires_review, t.mandatory, t.position, t.kind, t.location, t.proms_instrument, t.proms_timepoint
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

-- ---------------------------------------------------------------- guard trigger: protect the two new columns too

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
      new.review_note, new.reviewed_at, new.reviewed_by, new.kind, new.location, new.scheduled_at,
      new.proms_instrument, new.proms_timepoint)
     is distinct from
     (old.journey_id, old.clinic_id, old.title, old.description, old.owner, old.due_offset_days,
      old.requires_evidence, old.requires_review, old.mandatory, old.position, old.depends_on,
      old.review_note, old.reviewed_at, old.reviewed_by, old.kind, old.location, old.scheduled_at,
      old.proms_instrument, old.proms_timepoint) then
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

-- ---------------------------------------------------------------- seed: add the 3 questionnaires to every knee template
-- Knee only for now, per the plan to extend to other procedures later. Skipped per-template if
-- already there (so this is safe to re-run after a questionnaire was added once).

do $$
declare
  t record;
  v_max_pos int;
begin
  for t in select id, clinic_id from templates where name like 'החלפת ברך%' loop
    if exists (select 1 from template_tasks where template_id = t.id and kind = 'proms') then
      continue;
    end if;
    select coalesce(max(position), 0) into v_max_pos from template_tasks where template_id = t.id;

    insert into template_tasks (template_id, clinic_id, title, description, owner, due_offset_days,
      requires_evidence, requires_review, mandatory, position, kind, proms_instrument, proms_timepoint)
    values
      (t.id, t.clinic_id, 'שאלון בריאות לפני הניתוח', 'כמה שאלות קצרות על מצבך לפני הניתוח — עוזר לנו לעקוב אחרי השיפור שלך לאורך זמן.',
        'patient', 10, false, false, false, v_max_pos + 1, 'proms', 'eq5d5l', 'baseline'),
      (t.id, t.clinic_id, 'שאלון הברך לפני הניתוח', 'שאלון קצר על תפקוד הברך — עוזר לנו לעקוב אחרי השיפור שלך לאורך זמן.',
        'patient', 9, false, false, false, v_max_pos + 2, 'proms', 'oks', 'baseline'),
      (t.id, t.clinic_id, 'שאלון מעקב - 3 חודשים אחרי הניתוח', 'אותן שאלות כמו לפני הניתוח, כדי שנוכל להשוות.',
        'patient', -90, false, false, false, v_max_pos + 3, 'proms', 'eq5d5l', 'month3'),
      (t.id, t.clinic_id, 'שאלון הברך - 3 חודשים אחרי הניתוח', 'אותן שאלות כמו לפני הניתוח, כדי שנוכל להשוות.',
        'patient', -90, false, false, false, v_max_pos + 4, 'proms', 'oks', 'month3'),
      (t.id, t.clinic_id, 'שאלון מעקב - שנה אחרי הניתוח', 'הבדיקה האחרונה בסדרה — תודה שממשיכים איתנו.',
        'patient', -365, false, false, false, v_max_pos + 5, 'proms', 'eq5d5l', 'year1'),
      (t.id, t.clinic_id, 'שאלון הברך - שנה אחרי הניתוח', 'הבדיקה האחרונה בסדרה — תודה שממשיכים איתנו.',
        'patient', -365, false, false, false, v_max_pos + 6, 'proms', 'oks', 'year1');
  end loop;
end $$;
