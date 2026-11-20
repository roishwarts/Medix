-- save_clinical_summary() was a plain upsert: two doctors (or the same doctor in two tabs) editing
-- the same patient's diagnosis/allergies/medications at once would have the second save silently
-- overwrite the first with no warning - for a clinical-safety field, that's a real risk, not just a
-- UX nicety. Adds optimistic-concurrency: the caller must pass back the updated_at it last loaded;
-- if the row changed since, the save is rejected with a clear "someone else changed this" error
-- instead of clobbering it. Run after patch-doctor-queue.sql. Safe to re-run.

-- A new parameter changes the signature, so create-or-replace alone would leave the old 7-arg
-- function in place as a separate overload (ambiguous: both would match a 7-arg call). Drop it first.
drop function if exists save_clinical_summary(uuid, text, text, text, text, text, text);

create or replace function save_clinical_summary(
  p_journey uuid, p_diagnosis text, p_side text, p_allergies text, p_medications text, p_history text, p_notes text,
  p_expected_updated_at timestamptz default null
) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
  v_current timestamptz;
  v_new timestamptz := now();
begin
  if not is_doctor() then raise exception 'not allowed'; end if;
  if not exists (select 1 from journeys where id = p_journey and clinic_id = v_clinic) then
    raise exception 'journey not found';
  end if;

  select updated_at into v_current from clinical_summaries where journey_id = p_journey;
  if v_current is distinct from p_expected_updated_at then
    raise exception 'conflict: the clinical summary was changed by someone else since you opened it';
  end if;

  insert into clinical_summaries (journey_id, clinic_id, diagnosis, side, allergies, medications, medical_history, notes, updated_by, updated_at)
  values (p_journey, v_clinic, nullif(trim(coalesce(p_diagnosis, '')), ''), nullif(p_side, ''),
    nullif(trim(coalesce(p_allergies, '')), ''), nullif(trim(coalesce(p_medications, '')), ''),
    nullif(trim(coalesce(p_history, '')), ''), nullif(trim(coalesce(p_notes, '')), ''), auth.uid(), v_new)
  on conflict (journey_id) do update set
    diagnosis = excluded.diagnosis, side = excluded.side, allergies = excluded.allergies,
    medications = excluded.medications, medical_history = excluded.medical_history, notes = excluded.notes,
    updated_by = auth.uid(), updated_at = v_new;

  return v_new;
end $$;
revoke execute on function save_clinical_summary(uuid, text, text, text, text, text, text, timestamptz) from public, anon;

-- Records that this patch ran, for _migrations-table.sql's applied-patches query.
insert into _migrations (name) values ('patch-clinical-summary-concurrency.sql') on conflict (name) do nothing;
