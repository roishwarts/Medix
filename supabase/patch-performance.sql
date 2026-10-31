-- Backend performance hardening: indexes on every foreign key, RLS policies rewritten so their
-- function calls are evaluated once per query instead of once per row, and scheduled cleanup of
-- two logs that only grow over time.
--
-- This patch touches tables and policies defined across every other file in this folder (referrals,
-- visit_notes, clinic_links, clinic_videos, account_links, password_reset_requests, and more) —
-- run it LAST, only after every other patch in supabase/ has already been applied. Safe to re-run.

-- ============================================================ 1. indexes on every foreign key
-- Postgres does not index a foreign key column automatically. Without one, every JOIN through it
-- and every delete that cascades through it does a full table scan — fine at demo scale, not at
-- a real clinic's scale after a few years of patients.

create index if not exists activity_events_journey on activity_events(journey_id);
create index if not exists activity_events_actor on activity_events(actor_id);

create index if not exists patient_caregivers_clinic on patient_caregivers(clinic_id);
create index if not exists caregiver_invites_clinic on caregiver_invites(clinic_id);
create index if not exists caregiver_invites_created_by on caregiver_invites(created_by);

create index if not exists account_links_clinic on account_links(clinic_id);
create index if not exists account_links_user on account_links(user_id);
create index if not exists account_links_created_by on account_links(created_by);

create index if not exists password_reset_requests_clinic on password_reset_requests(clinic_id);
create index if not exists password_reset_requests_user on password_reset_requests(user_id);
create index if not exists password_reset_requests_handled_by on password_reset_requests(handled_by);

create index if not exists clinic_options_clinic on clinic_options(clinic_id);
create index if not exists clinic_links_clinic on clinic_links(clinic_id);
create index if not exists clinic_videos_clinic on clinic_videos(clinic_id);

create index if not exists referrals_patient on referrals(patient_id);
create index if not exists referrals_clinic on referrals(clinic_id);
create index if not exists referrals_doctor on referrals(doctor_id);

create index if not exists visit_notes_patient on visit_notes(patient_id);
create index if not exists visit_notes_clinic on visit_notes(clinic_id);
create index if not exists visit_notes_doctor on visit_notes(doctor_id);

create index if not exists profiles_clinic on profiles(clinic_id);
create index if not exists patients_clinic on patients(clinic_id);
create index if not exists templates_clinic on templates(clinic_id);
create index if not exists templates_source on templates(source_template_id);
create index if not exists template_tasks_template on template_tasks(template_id);
create index if not exists template_tasks_clinic on template_tasks(clinic_id);
create index if not exists journeys_template on journeys(template_id);
create index if not exists journeys_cancelled_by on journeys(cancelled_by);
create index if not exists journey_tasks_clinic on journey_tasks(clinic_id);
create index if not exists journey_tasks_reviewed_by on journey_tasks(reviewed_by);
create index if not exists journey_tasks_submitted_by on journey_tasks(submitted_by);

-- ============================================================ 2. RLS: cache the function call once per query
-- `using (is_staff() and ...)` re-runs is_staff() for every row the planner considers. Wrapping the
-- call as a scalar subquery — `using ((select is_staff()) and ...)` — lets Postgres evaluate it once
-- per statement and reuse the result. Same logic, same access rules, just evaluated once instead of
-- per row. See https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

drop policy if exists activity_staff_read on activity_events;
create policy activity_staff_read on activity_events for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));

drop policy if exists activity_seen_own on activity_seen;
create policy activity_seen_own on activity_seen for all
  using (user_id = (select auth.uid()) and (select is_staff()))
  with check (user_id = (select auth.uid()) and (select is_staff()));

drop policy if exists pc_staff on patient_caregivers;
create policy pc_staff on patient_caregivers for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists pc_patient on patient_caregivers;
create policy pc_patient on patient_caregivers for select using ((select owns_patient(patient_id)));
drop policy if exists pc_self on patient_caregivers;
create policy pc_self on patient_caregivers for select using (user_id = (select auth.uid()));

drop policy if exists inv_patient_select on caregiver_invites;
create policy inv_patient_select on caregiver_invites for select using (created_by = (select auth.uid()));
drop policy if exists inv_patient_insert on caregiver_invites;
create policy inv_patient_insert on caregiver_invites for insert
  with check (created_by = (select auth.uid()) and (select owns_patient(patient_id)) and clinic_id = (select auth_clinic()));
drop policy if exists inv_patient_delete on caregiver_invites;
create policy inv_patient_delete on caregiver_invites for delete using (created_by = (select auth.uid()));
drop policy if exists inv_staff_select on caregiver_invites;
create policy inv_staff_select on caregiver_invites for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));

drop policy if exists patients_caregiver on patients;
create policy patients_caregiver on patients for select using ((select is_caregiver_of(id)));

drop policy if exists clinic_logos_insert on storage.objects;
create policy clinic_logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'clinic-logos' and (select is_staff()) and (select clinic_logo_access(name)));
drop policy if exists clinic_logos_update on storage.objects;
create policy clinic_logos_update on storage.objects for update to authenticated
  using (bucket_id = 'clinic-logos' and (select is_staff()) and (select clinic_logo_access(name)));
drop policy if exists clinic_logos_delete on storage.objects;
create policy clinic_logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'clinic-logos' and (select is_staff()) and (select clinic_logo_access(name)));

drop policy if exists account_links_staff_read on account_links;
create policy account_links_staff_read on account_links for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists reset_requests_staff_read on password_reset_requests;
create policy reset_requests_staff_read on password_reset_requests for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));

drop policy if exists clinic_options_read on clinic_options;
create policy clinic_options_read on clinic_options for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));

drop policy if exists clinic_links_read on clinic_links;
create policy clinic_links_read on clinic_links for select using (clinic_id = (select auth_clinic()));
drop policy if exists clinic_links_write on clinic_links;
create policy clinic_links_write on clinic_links for all
  using ((select is_staff()) and clinic_id = (select auth_clinic()))
  with check ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists clinic_videos_read on clinic_videos;
create policy clinic_videos_read on clinic_videos for select using (clinic_id = (select auth_clinic()));
drop policy if exists clinic_videos_write on clinic_videos;
create policy clinic_videos_write on clinic_videos for all
  using ((select is_staff()) and clinic_id = (select auth_clinic()))
  with check ((select is_staff()) and clinic_id = (select auth_clinic()));

drop policy if exists clinic_videos_select on storage.objects;
create policy clinic_videos_select on storage.objects for select to authenticated
  using (bucket_id = 'clinic-videos' and (select clinic_video_access(name)));
drop policy if exists clinic_videos_insert on storage.objects;
create policy clinic_videos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'clinic-videos' and (select is_staff()) and (select clinic_video_access(name)));
drop policy if exists clinic_videos_delete on storage.objects;
create policy clinic_videos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'clinic-videos' and (select clinic_video_access(name)));

drop policy if exists referrals_staff_select on referrals;
create policy referrals_staff_select on referrals for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists visit_notes_doctor_select on visit_notes;
create policy visit_notes_doctor_select on visit_notes for select
  using ((select is_doctor()) and clinic_id = (select auth_clinic()));

drop policy if exists clinics_read on clinics;
create policy clinics_read on clinics for select using (id = (select auth_clinic()));
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select
  using (id = (select auth.uid()) or ((select is_staff()) and clinic_id = (select auth_clinic())));
drop policy if exists patients_staff on patients;
create policy patients_staff on patients for all
  using ((select is_staff()) and clinic_id = (select auth_clinic()))
  with check ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists patients_self on patients;
create policy patients_self on patients for select using (user_id = (select auth.uid()));
drop policy if exists templates_read on templates;
create policy templates_read on templates for select using ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists templates_doctor on templates;
create policy templates_doctor on templates for all
  using ((select is_doctor()) and clinic_id = (select auth_clinic()))
  with check ((select is_doctor()) and clinic_id = (select auth_clinic()));
drop policy if exists template_tasks_read on template_tasks;
create policy template_tasks_read on template_tasks for select using ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists template_tasks_doctor on template_tasks;
create policy template_tasks_doctor on template_tasks for all
  using ((select is_doctor()) and clinic_id = (select auth_clinic()))
  with check ((select is_doctor()) and clinic_id = (select auth_clinic()));
drop policy if exists journeys_staff on journeys;
create policy journeys_staff on journeys for all
  using ((select is_staff()) and clinic_id = (select auth_clinic()))
  with check ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists journeys_self on journeys;
create policy journeys_self on journeys for select using ((select owns_journey(id)));
drop policy if exists journey_tasks_staff_read on journey_tasks;
create policy journey_tasks_staff_read on journey_tasks for select
  using ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists journey_tasks_staff_update on journey_tasks;
create policy journey_tasks_staff_update on journey_tasks for update
  using ((select is_staff()) and clinic_id = (select auth_clinic()))
  with check ((select is_staff()) and clinic_id = (select auth_clinic()));
drop policy if exists journey_tasks_doctor_write on journey_tasks;
create policy journey_tasks_doctor_write on journey_tasks for all
  using ((select is_doctor()) and clinic_id = (select auth_clinic()))
  with check ((select is_doctor()) and clinic_id = (select auth_clinic()));
drop policy if exists journey_tasks_self_read on journey_tasks;
create policy journey_tasks_self_read on journey_tasks for select using ((select owns_journey(journey_id)));
drop policy if exists journey_tasks_self_update on journey_tasks;
create policy journey_tasks_self_update on journey_tasks for update
  using ((select owns_journey(journey_id)))
  with check ((select owns_journey(journey_id)));

drop policy if exists evidence_select on storage.objects;
create policy evidence_select on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (select evidence_access(name)));
drop policy if exists evidence_insert on storage.objects;
create policy evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (select evidence_access(name)));

-- mfa_gate_evidence (patch-mfa.sql) already uses this pattern — nothing to redo there.

-- ============================================================ 3. scheduled cleanup of pure log tables
-- Only tables that are pure logs, never shown as product history, are pruned here. admin_audit is an
-- internal "who viewed what" trail; password_reset_requests rows are transient once handled. Patient-
-- facing history (activity_events, visit_notes, referrals) is left alone — that's product data, not a
-- log, and deleting it is a retention-policy decision for the clinic, not a performance one.
--
-- Requires the pg_cron extension. On Supabase, enable it once via Dashboard → Database → Extensions
-- if the next line errors with "permission denied" or "extension not available".
create extension if not exists pg_cron;

-- cron.schedule() with an existing job name updates that job in place (pg_cron 1.5+), so this is
-- safe to re-run.
select cron.schedule(
  'medix-cleanup-admin-audit',
  '0 3 * * *',
  $$ delete from public.admin_audit where created_at < now() - interval '180 days' $$
);

select cron.schedule(
  'medix-cleanup-handled-resets',
  '0 3 * * *',
  $$ delete from public.password_reset_requests where handled_at is not null and handled_at < now() - interval '90 days' $$
);
