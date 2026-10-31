-- Tracks which base template a clinic's copy came from, so the admin base-templates list can show
-- an accurate "in use by N clinics" instead of nothing (there was no way to tell before this).
-- Run after patch-admin.sql. Safe to re-run.

alter table templates add column if not exists source_template_id uuid references templates(id) on delete set null;

-- Only admin_copy_base_template represents "a clinic got this from a base template" — a clinic
-- duplicating its own template (app/clinic/templates/new?from=) goes through save_template directly,
-- not _copy_template, so that path is correctly left with no provenance (it isn't derived from a base).
create or replace function admin_copy_base_template(p_base uuid, p_clinic uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_new uuid;
begin
  if not exists (select 1 from templates where id = p_base and is_base) then
    raise exception 'base template not found';
  end if;
  v_new := _copy_template(p_base, p_clinic, false);
  update templates set source_template_id = p_base where id = v_new;
  return v_new;
end $$;

revoke execute on function admin_copy_base_template(uuid, uuid) from public, anon, authenticated;
