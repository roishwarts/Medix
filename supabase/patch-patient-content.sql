-- Patient-facing clinic content: general surgery info, clinic links (website/Instagram/etc.),
-- and instructional videos (before/after surgery). Run after patch-staff-edit.sql. Safe to re-run.

-- ---------------------------------------------------------------- general info

alter table templates add column if not exists patient_info text;
alter table journeys add column if not exists patient_info text;

-- Starting a journey copies the template's patient-facing info, same as every other template field:
-- later edits to the template never touch journeys that already started.
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

-- Doctor and staff may both edit a template's patient-facing info (unlike the task list, which stays doctor-only).
create function save_template_patient_info(p_template uuid, p_patient_info text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update templates set patient_info = nullif(trim(p_patient_info), ''), updated_at = now()
  where id = p_template and clinic_id = auth_clinic();
  if not found then raise exception 'template not found'; end if;
end $$;

-- Lets staff adjust one patient's general info after their journey already started, without touching the template.
create function save_journey_patient_info(p_journey uuid, p_patient_info text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update journeys set patient_info = nullif(trim(p_patient_info), '')
  where id = p_journey and clinic_id = auth_clinic();
  if not found then raise exception 'journey not found'; end if;
end $$;

revoke execute on function save_template_patient_info(uuid, text) from public, anon;
revoke execute on function save_journey_patient_info(uuid, text) from public, anon;

-- ---------------------------------------------------------------- clinic links (website, Instagram, ...)

create table if not exists clinic_links (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  label text not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table clinic_links enable row level security;

drop policy if exists clinic_links_read on clinic_links;
create policy clinic_links_read on clinic_links for select using (clinic_id = auth_clinic());

drop policy if exists clinic_links_write on clinic_links;
create policy clinic_links_write on clinic_links for all
  using (is_staff() and clinic_id = auth_clinic())
  with check (is_staff() and clinic_id = auth_clinic());

-- ---------------------------------------------------------------- instructional videos

create table if not exists clinic_videos (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  title text not null,
  phase text not null check (phase in ('before', 'after')),
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table clinic_videos enable row level security;

drop policy if exists clinic_videos_read on clinic_videos;
create policy clinic_videos_read on clinic_videos for select using (clinic_id = auth_clinic());

drop policy if exists clinic_videos_write on clinic_videos;
create policy clinic_videos_write on clinic_videos for all
  using (is_staff() and clinic_id = auth_clinic())
  with check (is_staff() and clinic_id = auth_clinic());

-- Storage path convention: "<clinic_id>/<file>".
create function clinic_video_access(path text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  first_part text := split_part(path, '/', 1);
begin
  if first_part !~ '^[0-9a-fA-F-]{36}$' then return false; end if;
  return first_part::uuid = auth_clinic();
end $$;

insert into storage.buckets (id, name, public) values ('clinic-videos', 'clinic-videos', false)
on conflict (id) do nothing;

drop policy if exists clinic_videos_select on storage.objects;
create policy clinic_videos_select on storage.objects for select to authenticated
  using (bucket_id = 'clinic-videos' and clinic_video_access(name));

drop policy if exists clinic_videos_insert on storage.objects;
create policy clinic_videos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'clinic-videos' and is_staff() and clinic_video_access(name));

drop policy if exists clinic_videos_delete on storage.objects;
create policy clinic_videos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'clinic-videos' and is_staff() and clinic_video_access(name));

-- If two-factor login (patch-mfa.sql) is already installed, gate these two new tables the same way
-- it gates the rest of the clinic's data: staff/doctor of a clinic that requires 2FA need a verified session.
do $$
begin
  if to_regproc('public.mfa_ok()') is not null then
    drop policy if exists mfa_gate on public.clinic_links;
    create policy mfa_gate on public.clinic_links as restrictive for all to authenticated using ((select mfa_ok()));
    drop policy if exists mfa_gate on public.clinic_videos;
    create policy mfa_gate on public.clinic_videos as restrictive for all to authenticated using ((select mfa_ok()));
  end if;
end $$;
