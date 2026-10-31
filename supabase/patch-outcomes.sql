-- Outcome tracking for the managers dashboard (app/clinic/insights): surgery cancellations with a
-- reason, and when a journey's prep first reached 100% readiness (stamped automatically — there was
-- no stored moment for that before, only the live computed percentage).
-- Run after patch-calendar.sql. Safe to re-run.

alter table journeys add column if not exists cancelled_at timestamptz;
alter table journeys add column if not exists cancelled_reason text;
alter table journeys add column if not exists cancelled_by uuid references auth.users(id) on delete set null;
alter table journeys add column if not exists prep_completed_at timestamptz;

do $$ begin
  alter table journeys add constraint journeys_cancelled_reason_check check (
    cancelled_reason is null or cancelled_reason in ('patient_request', 'medical', 'insurance', 'clinic_schedule', 'other')
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- prep_completed_at

-- Backfill: for a journey that is already fully ready today, the best available timestamp for
-- "when" is the moment its last required task was accepted.
update journeys j
set prep_completed_at = sub.done_at
from (
  select jt.journey_id, max(jt.reviewed_at) as done_at,
         count(*) filter (where jt.status <> 'accepted') as not_done
  from journey_tasks jt
  where jt.mandatory and jt.due_offset_days >= 0
  group by jt.journey_id
) sub
where sub.journey_id = j.id and sub.not_done = 0 and j.prep_completed_at is null;

-- Stamps the moment a journey's mandatory pre-op tasks are all accepted (mirrors the 100%
-- condition in lib/journey.ts's summarize()). Never unstamped once set: it is a milestone, not
-- a live status, so a task reopened later doesn't erase that the prep was once complete.
create or replace function mark_prep_completed() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_not_done int;
begin
  select count(*) into v_not_done
  from journey_tasks
  where journey_id = new.journey_id and mandatory and due_offset_days >= 0 and status <> 'accepted';
  if v_not_done = 0 then
    update journeys set prep_completed_at = coalesce(prep_completed_at, now()) where id = new.journey_id;
  end if;
  return new;
end $$;

drop trigger if exists journey_tasks_mark_ready on journey_tasks;
create trigger journey_tasks_mark_ready
after insert or update of status on journey_tasks
for each row execute function mark_prep_completed();

-- ---------------------------------------------------------------- cancellation

create or replace function cancel_journey(p_journey uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  if p_reason not in ('patient_request', 'medical', 'insurance', 'clinic_schedule', 'other') then
    raise exception 'invalid reason';
  end if;
  update journeys set cancelled_at = now(), cancelled_reason = p_reason, cancelled_by = auth.uid()
  where id = p_journey and clinic_id = v_clinic;
  if not found then raise exception 'journey not found'; end if;
end $$;

revoke execute on function cancel_journey(uuid, text) from public, anon;

create or replace function uncancel_journey(p_journey uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := auth_clinic();
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update journeys set cancelled_at = null, cancelled_reason = null, cancelled_by = null
  where id = p_journey and clinic_id = v_clinic;
end $$;

revoke execute on function uncancel_journey(uuid) from public, anon;
