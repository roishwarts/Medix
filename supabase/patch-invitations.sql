-- Invitation links patch. Run after patch-caregivers.sql and patch-admin.sql. Safe to run more than once.
-- Adds: patients without a login yet (invited by link), reset-password requests, staff-created caregiver invites.

-- ---------------------------------------------------------------- patients and caregivers
alter table patients add column if not exists email text;
alter table caregiver_invites add column if not exists invitee_phone text;
alter table caregiver_invites add column if not exists consent_confirmed_by_staff boolean not null default false;

-- ---------------------------------------------------------------- one-time account links
-- purpose patient_join: a patient creates their login. password_reset: a user sets a new password.
-- Only a hash of the token is stored; the link is shown to the sender once.
create table if not exists account_links (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  purpose text not null check (purpose in ('patient_join', 'password_reset')),
  patient_id uuid references patients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists account_links_patient on account_links(patient_id);
alter table account_links enable row level security;

drop policy if exists account_links_staff_read on account_links;
create policy account_links_staff_read on account_links for select
  using (is_staff() and clinic_id = auth_clinic());

-- ---------------------------------------------------------------- "I forgot my password" requests
create table if not exists password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null,
  requested_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references auth.users(id) on delete set null
);
-- at most one open request per user
create unique index if not exists password_reset_one_open on password_reset_requests(user_id) where handled_at is null;
alter table password_reset_requests enable row level security;

drop policy if exists reset_requests_staff_read on password_reset_requests;
create policy reset_requests_staff_read on password_reset_requests for select
  using (is_staff() and clinic_id = auth_clinic());

-- ---------------------------------------------------------------- lookup used by the server only
create or replace function admin_user_by_email(p_email text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1
$$;
revoke execute on function admin_user_by_email(text) from public, anon, authenticated;
