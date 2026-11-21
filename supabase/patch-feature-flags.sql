-- Per-clinic switches for the two features that may count as medical-device software and are on hold for a
-- regulatory opinion: the PROMS questionnaires (OKS / EQ-5D) and the "when to call urgently" red flags.
-- Both default to ON so nothing changes for a clinic that already uses them. A platform admin turns one off
-- from the clinic's page in the admin area; the app then hides it from patients and staff (the stored data stays).
-- Safe to re-run.

alter table clinics add column if not exists proms_enabled boolean not null default true;
alter table clinics add column if not exists red_flags_enabled boolean not null default true;

-- Records that this patch ran, for _migrations-table.sql's applied-patches query.
insert into _migrations (name) values ('patch-feature-flags.sql') on conflict (name) do nothing;
