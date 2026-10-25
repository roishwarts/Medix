-- Two-factor login (authenticator app) for staff and doctors, switched on per clinic by the platform admin.
-- Safe to re-run. Run last, after the other patches.
-- Also enable it in Supabase: Authentication -> Sign In / Providers -> Multi-Factor -> TOTP (enroll and verify on).

alter table clinics add column if not exists mfa_required boolean not null default false;

-- True unless this user is clinic staff/doctor in a clinic that requires 2FA and the session has not passed it (aal2).
create or replace function mfa_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1 from profiles p join clinics c on c.id = p.clinic_id
      where p.id = auth.uid() and p.role in ('staff', 'doctor') and c.mfa_required
    )
$$;

-- Database-level gate: without a verified second factor these users read and write nothing.
-- (profiles and clinics stay readable so the app can tell them to complete the check.)
do $$
declare t text;
begin
  foreach t in array array[
    'patients', 'templates', 'template_tasks', 'journeys', 'journey_tasks', 'patient_caregivers',
    'caregiver_invites', 'account_links', 'password_reset_requests', 'activity_events', 'activity_seen'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists mfa_gate on public.%I', t);
      execute format('create policy mfa_gate on public.%I as restrictive for all to authenticated using ((select mfa_ok()))', t);
    end if;
  end loop;
end $$;

drop policy if exists mfa_gate_evidence on storage.objects;
create policy mfa_gate_evidence on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'evidence' or (select mfa_ok()));
