-- Tracks a patient's consent to the privacy policy, separately from onboarded_at (patch-onboarding.sql):
-- onboarded_at only means "has seen the how-this-works tutorial" and must never be read as consent.
-- privacy_consent_version lets a future policy update force re-consent (compare against the current
-- version in app code) without losing the history of what was agreed to and when.
-- Run after patch-onboarding.sql. Safe to re-run.

alter table profiles add column if not exists privacy_consent_at timestamptz;
alter table profiles add column if not exists privacy_consent_version text;

-- Self-only, mirroring mark_onboarded(): no UPDATE policy exists on profiles at all, so this is the
-- only way a signed-in user can record their own consent.
create or replace function record_privacy_consent(p_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if trim(coalesce(p_version, '')) = '' then raise exception 'version is required'; end if;
  update profiles set privacy_consent_at = now(), privacy_consent_version = p_version where id = auth.uid();
end $$;

revoke execute on function record_privacy_consent(text) from public, anon;

-- Records that this patch ran, for _migrations-table.sql's applied-patches query.
insert into _migrations (name) values ('patch-privacy-consent.sql') on conflict (name) do nothing;
