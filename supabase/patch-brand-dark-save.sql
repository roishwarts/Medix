-- Lets staff save brand_dark themselves from the branding form (patch-brand-theme.sql added the
-- column but never gave it a save path - only brand_color had one, via save_clinic_brand_color).
-- Mirrors that function exactly. Run after patch-brand-theme.sql. Safe to re-run.

create or replace function save_clinic_brand_dark(p_color text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_color text := nullif(trim(p_color), '');
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  if v_color is not null and v_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'invalid color'; end if;
  update clinics set brand_dark = v_color where id = auth_clinic();
end $$;

revoke execute on function save_clinic_brand_dark(text) from public, anon;
