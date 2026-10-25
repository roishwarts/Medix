-- Hospitals and companies per clinic. Safe to re-run. Run after schema.sql and patch-admin.sql.
-- The admin maintains each clinic's lists; staff and doctors pick from them for every patient.

create table if not exists clinic_options (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  kind text not null check (kind in ('hospital', 'company')),
  name text not null,
  created_at timestamptz not null default now(),
  unique (clinic_id, kind, name)
);
alter table clinic_options enable row level security;

drop policy if exists clinic_options_read on clinic_options;
create policy clinic_options_read on clinic_options for select
  using (is_staff() and clinic_id = auth_clinic());

-- The chosen values are stored on the patient as plain text, so removing an option never erases history.
alter table patients add column if not exists hospital text;
alter table patients add column if not exists company text;
