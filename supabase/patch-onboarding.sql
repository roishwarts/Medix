-- Tracks whether a patient has been through the "how this works" onboarding screens, so it shows
-- automatically once (per account, across devices) and never again unless they open it themselves.
-- Run after patch-clinic-logo.sql. Safe to re-run.

alter table profiles add column if not exists onboarded_at timestamptz;

-- No UPDATE policy exists on profiles at all (edits go through the admin service role), so a
-- narrow, self-only function is the only way a signed-in user can set this on their own row.
create function mark_onboarded() returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiles set onboarded_at = now() where id = auth.uid();
end $$;

revoke execute on function mark_onboarded() from public, anon;
