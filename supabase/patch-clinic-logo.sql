-- Per-clinic logo, shown in the app header to patients and staff alike. A public bucket (a logo is
-- marketing material, not patient data) so it serves directly with no signed URL to refresh. Run after
-- patch-contact-info.sql. Safe to re-run.

alter table clinics add column if not exists logo_path text;

create function save_clinic_logo(p_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update clinics set logo_path = nullif(trim(p_path), '') where id = auth_clinic();
end $$;

revoke execute on function save_clinic_logo(text) from public, anon;

-- Storage path convention: "<clinic_id>/logo".
create function clinic_logo_access(path text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  first_part text := split_part(path, '/', 1);
begin
  if first_part !~ '^[0-9a-fA-F-]{36}$' then return false; end if;
  return first_part::uuid = auth_clinic();
end $$;

insert into storage.buckets (id, name, public) values ('clinic-logos', 'clinic-logos', true)
on conflict (id) do nothing;

drop policy if exists clinic_logos_insert on storage.objects;
create policy clinic_logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'clinic-logos' and is_staff() and clinic_logo_access(name));

drop policy if exists clinic_logos_update on storage.objects;
create policy clinic_logos_update on storage.objects for update to authenticated
  using (bucket_id = 'clinic-logos' and is_staff() and clinic_logo_access(name));

drop policy if exists clinic_logos_delete on storage.objects;
create policy clinic_logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'clinic-logos' and is_staff() and clinic_logo_access(name));

-- No select policy needed: the bucket is public, so GET /storage/v1/object/public/clinic-logos/...
-- is served directly without evaluating RLS.
