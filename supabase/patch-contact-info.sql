-- Patient-facing "my care team" card: one primary contact (name/role/phone + WhatsApp) per
-- clinic, a separate emergency number, and free-text office hours. Run after
-- patch-patient-content.sql. Safe to re-run.

alter table clinics add column if not exists contact_name text;
alter table clinics add column if not exists contact_role text;
alter table clinics add column if not exists contact_phone text;
alter table clinics add column if not exists emergency_phone text;
alter table clinics add column if not exists office_hours text;

-- Staff and doctor may edit their own clinic's contact card. A dedicated function (rather than
-- a blanket UPDATE policy on `clinics`) so this can't be used to touch unrelated columns like
-- mfa_required, which stays admin-only.
create or replace function save_clinic_contact_info(
  p_contact_name text, p_contact_role text, p_contact_phone text, p_emergency_phone text, p_office_hours text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update clinics set
    contact_name = nullif(trim(p_contact_name), ''),
    contact_role = nullif(trim(p_contact_role), ''),
    contact_phone = nullif(trim(p_contact_phone), ''),
    emergency_phone = nullif(trim(p_emergency_phone), ''),
    office_hours = nullif(trim(p_office_hours), '')
  where id = auth_clinic();
end $$;

revoke execute on function save_clinic_contact_info(text, text, text, text, text) from public, anon;
