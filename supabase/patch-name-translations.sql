-- Lets a clinic's name and a person's own name show in Latin letters when the app is in English/
-- Russian/Arabic, instead of always showing the Hebrew spelling regardless of the chosen language.
-- Both are optional: with no translation, the Hebrew name is shown in every language, same as
-- before this patch. Safe to re-run.

alter table clinics add column if not exists name_en text;
alter table profiles add column if not exists full_name_en text;

create or replace function save_clinic_name_en(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update clinics set name_en = nullif(trim(p_name), '') where id = auth_clinic();
end $$;
revoke execute on function save_clinic_name_en(text) from public, anon;

-- Anyone (not just staff/doctor) may set their own English name - a patient or family member's
-- name can need this too, not only the clinic's.
create or replace function save_my_full_name_en(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  update profiles set full_name_en = nullif(trim(p_name), '') where id = auth.uid();
end $$;
revoke execute on function save_my_full_name_en(text) from public, anon;
