-- Lets the manual patient status be "cancelled" (בוטל) too. Safe to re-run.
-- (A cancelled surgery shows this status automatically; this only allows picking it by hand.)
alter table patients drop constraint if exists patients_stage_override_check;
alter table patients add constraint patients_stage_override_check
  check (stage_override is null or stage_override in ('decided', 'preparing', 'ready', 'recovering', 'finished', 'cancelled'));

-- Records that this patch ran, for _migrations-table.sql's applied-patches query.
insert into _migrations (name) values ('patch-stage-cancelled.sql') on conflict (name) do nothing;
