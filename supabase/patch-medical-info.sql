-- Per-patient ID, HMO (קופת חולים) and private-insurance details. Shown on the patient's own card
-- only — not injected into referral letters or anywhere else. Run after schema.sql. Safe to re-run.

alter table patients add column if not exists national_id text;
alter table patients add column if not exists hmo text;
alter table patients add column if not exists insurance_company text;
alter table patients add column if not exists insurance_policy_number text;
alter table patients add column if not exists insurance_phone text;

do $$ begin
  alter table patients add constraint patients_hmo_check
    check (hmo is null or hmo in ('clalit', 'maccabi', 'meuhedet', 'leumit', 'other'));
exception when duplicate_object then null; end $$;
