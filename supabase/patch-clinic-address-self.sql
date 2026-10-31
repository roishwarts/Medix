-- Lets the clinic's own staff/doctor set their street address themselves, instead of only the
-- platform admin (supabase/patch-location.sql added the column; app/admin/actions.ts's
-- setClinicAddress still works for admin, unchanged). Run after patch-location.sql. Safe to re-run.

create function save_clinic_address(p_address text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_address text := nullif(trim(regexp_replace(p_address, '\s+', ' ', 'g')), '');
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  if v_address is not null and length(v_address) > 200 then raise exception 'address too long'; end if;
  update clinics set address = v_address where id = auth_clinic();
end $$;

revoke execute on function save_clinic_address(text) from public, anon;
