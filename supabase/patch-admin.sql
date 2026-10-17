-- Admin panel patch. Run after schema.sql, seed.sql, patch-calendar.sql and patch-caregivers.sql.
-- Safe to run more than once.
-- Adds: platform admins, base templates (no clinic), disabled users, template copy/save helpers.

-- ---------------------------------------------------------------- platform admins
-- Only the server (service role) reads this table; RLS stays on with no policies.

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table platform_admins enable row level security;

-- ---------------------------------------------------------------- base templates

alter table templates alter column clinic_id drop not null;
alter table template_tasks alter column clinic_id drop not null;
alter table templates add column if not exists is_base boolean not null default false;

do $$ begin
  alter table templates add constraint templates_base_check
    check ((is_base and clinic_id is null) or (not is_base and clinic_id is not null));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- disabled users

alter table profiles add column if not exists disabled boolean not null default false;

-- A disabled user loses all clinic access immediately, even with a still-valid session.
create or replace function auth_clinic() returns uuid
language sql stable security definer set search_path = public as $$
  select clinic_id from profiles where id = auth.uid() and not disabled
$$;

create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and not disabled
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('staff', 'doctor') from profiles where id = auth.uid() and not disabled), false)
$$;

create or replace function is_doctor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'doctor' from profiles where id = auth.uid() and not disabled), false)
$$;

-- ---------------------------------------------------------------- template save (shared logic)

create or replace function _save_template(
  p_clinic uuid, p_base boolean, p_id uuid, p_name text, p_procedure text, p_description text, p_tasks jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into templates (clinic_id, is_base, name, procedure, description)
    values (p_clinic, p_base, p_name, p_procedure, p_description) returning id into v_id;
  else
    update templates set name = p_name, procedure = p_procedure, description = p_description, updated_at = now()
    where id = p_id and is_base = p_base and clinic_id is not distinct from p_clinic
    returning id into v_id;
    if v_id is null then raise exception 'template not found'; end if;
  end if;

  delete from template_tasks
  where template_id = v_id and id not in (select (e->>'id')::uuid from jsonb_array_elements(p_tasks) e);

  insert into template_tasks (id, template_id, clinic_id, title, description, owner, due_offset_days,
    requires_evidence, requires_review, mandatory, position, depends_on, kind, location)
  select (e.value->>'id')::uuid, v_id, p_clinic, e.value->>'title', nullif(e.value->>'description', ''),
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

create or replace function save_template(p_id uuid, p_name text, p_procedure text, p_description text, p_tasks jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not is_doctor() then raise exception 'not allowed'; end if;
  return _save_template(auth_clinic(), false, p_id, p_name, p_procedure, p_description, p_tasks);
end $$;

-- Base templates: callable only with the service role (the admin panel checks the admin first).
create or replace function admin_save_template(p_id uuid, p_name text, p_procedure text, p_description text, p_tasks jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  return _save_template(null, true, p_id, p_name, p_procedure, p_description, p_tasks);
end $$;

-- Copies a template with all its tasks and dependencies. p_clinic null + p_base true = a base template.
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
    requires_evidence, requires_review, mandatory, position, depends_on, kind, location)
  select s.new_id, v_new, p_clinic, s.title, s.description, s.owner, s.due_offset_days,
    s.requires_evidence, s.requires_review, s.mandatory, s.position,
    coalesce((select array_agg(d.new_id) from src d where d.id = any(s.depends_on)), '{}'),
    s.kind, s.location
  from src s;

  return v_new;
end $$;

-- Gives a clinic its own editable copy of a base template.
create or replace function admin_copy_base_template(p_base uuid, p_clinic uuid) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from templates where id = p_base and is_base) then
    raise exception 'base template not found';
  end if;
  return _copy_template(p_base, p_clinic, false);
end $$;

revoke execute on function _save_template(uuid, boolean, uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function admin_save_template(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function _copy_template(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function admin_copy_base_template(uuid, uuid) from public, anon, authenticated;
revoke execute on function save_template(uuid, text, text, text, jsonb) from public, anon;

-- ---------------------------------------------------------------- first base template
-- Copies the demo clinic's knee template as the first base template (skipped if one exists).

do $$
declare
  v_src uuid;
begin
  if exists (select 1 from templates where is_base) then return; end if;
  select id into v_src from templates
  where not is_base and name like 'החלפת ברך%' order by created_at limit 1;
  if v_src is not null then
    perform _copy_template(v_src, null, true);
  end if;
end $$;
