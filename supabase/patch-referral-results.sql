-- Closes the loop on a referral: staff can mark that the result came back and attach the file
-- (scan/photo of the report), instead of the referral staying "just a letter that went out" forever.
-- Run after patch-referrals.sql. Safe to re-run.

alter table referrals add column if not exists result_status text not null default 'pending';
do $$ begin
  alter table referrals add constraint referrals_result_status_check check (result_status in ('pending', 'received'));
exception when duplicate_object then null; end $$;
alter table referrals add column if not exists result_path text;
alter table referrals add column if not exists result_name text;
alter table referrals add column if not exists result_received_at timestamptz;
alter table referrals add column if not exists result_received_by uuid references auth.users(id) on delete set null;

create or replace function mark_referral_result_received(p_referral_id uuid, p_path text, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update referrals
  set result_status = 'received', result_path = p_path, result_name = p_name,
      result_received_at = now(), result_received_by = auth.uid()
  where id = p_referral_id and clinic_id = auth_clinic();
  if not found then raise exception 'referral not found'; end if;
end $$;

revoke execute on function mark_referral_result_received(uuid, text, text) from public, anon;

-- Undo, for a mis-click — the file itself is left in storage (harmless; it's just no longer linked).
create or replace function unmark_referral_result(p_referral_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update referrals
  set result_status = 'pending', result_path = null, result_name = null, result_received_at = null, result_received_by = null
  where id = p_referral_id and clinic_id = auth_clinic();
end $$;

revoke execute on function unmark_referral_result(uuid) from public, anon;

-- Storage path convention: "<referral_id>/<filename>". Private bucket (this is medical correspondence).
create or replace function referral_result_access(path text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  first_part text := split_part(path, '/', 1);
  r uuid;
begin
  if first_part !~ '^[0-9a-fA-F-]{36}$' then return false; end if;
  r := first_part::uuid;
  return is_staff() and exists (select 1 from referrals where id = r and clinic_id = auth_clinic());
end $$;

insert into storage.buckets (id, name, public) values ('referral-results', 'referral-results', false)
on conflict (id) do nothing;

-- Wrapped in (select ...) so Postgres evaluates it once per query, not once per row - the same
-- pattern patch-performance.sql applied to every other storage policy (evidence, clinic-logos,
-- clinic-videos); this one was added after that patch and missed it.
drop policy if exists referral_results_select on storage.objects;
create policy referral_results_select on storage.objects for select to authenticated
  using (bucket_id = 'referral-results' and (select referral_result_access(name)));
drop policy if exists referral_results_insert on storage.objects;
create policy referral_results_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'referral-results' and (select referral_result_access(name)));

-- Records that this patch ran, for _migrations-table.sql's applied-patches query.
insert into _migrations (name) values ('patch-referral-results.sql') on conflict (name) do nothing;
