-- Per-clinic accent color, applied on top of the logo (patch-clinic-logo.sql) for full branding.
-- Run after patch-clinic-logo.sql. Safe to re-run.

alter table clinics add column if not exists brand_color text;
do $$ begin
  alter table clinics add constraint clinics_brand_color_check check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$');
exception when duplicate_object then null;
end $$;

create or replace function save_clinic_brand_color(p_color text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_color text := nullif(trim(p_color), '');
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  if v_color is not null and v_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'invalid color'; end if;
  update clinics set brand_color = v_color where id = auth_clinic();
end $$;

revoke execute on function save_clinic_brand_color(text) from public, anon;
