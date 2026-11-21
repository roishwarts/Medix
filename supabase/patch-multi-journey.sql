-- Lets a patient have more than one journey: a second surgery planned in parallel with the first
-- (e.g. both knees), or a new one started after an earlier journey finished or was cancelled.
-- No RLS or RPC changes needed — start_journey() was already generic; the only thing stopping a
-- second journey was this index. Run any time. Safe to re-run.

drop index if exists journeys_one_per_patient;

-- Records that this patch ran, for _migrations-table.sql's applied-patches query.
insert into _migrations (name) values ('patch-multi-journey.sql') on conflict (name) do nothing;
