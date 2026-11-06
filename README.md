# Medix (v0)

Patient journey execution layer: turns a doctor's protocol into a workflow with dependencies, readiness and blockers.
Hebrew-only, RTL. Stack: Next.js (App Router) + Supabase (Auth, Postgres + RLS, Storage).

## Setup
1. Supabase SQL editor: run `supabase/schema.sql`, then `supabase/seed.sql` (demo data only).
   Then run every patch below **in this exact order** (all are safe to re-run; order matters because
   several patches `create or replace` the same trigger/function and a later redefinition fully
   replaces an earlier one — running one out of order can silently drop a feature instead of adding one):
   1. `patch-migrations-table.sql` — creates `_migrations`, a tiny table every patch below records itself into. Run this one **first, before anything else** (the rest assume it exists). To check what's actually been applied to a given database at any point: `select name, applied_at from _migrations order by applied_at;`.
   2. `patch-optional-evidence.sql` — lets a patient submit an evidence task without a file (demo flow). **Must run before `patch-calendar.sql`**: all three redefine the same `guard_patient_task_update()` trigger, and this one's version doesn't know about caregivers or PROMS yet — running it after those patches would silently strip that support back out.
   3. `patch-calendar.sql` — appointments + calendar.
   4. `patch-caregivers.sql` — family access.
   5. `patch-admin.sql` — admin panel.
   6. `patch-staff-edit.sql` — secretary can edit a journey.
   7. `patch-invitations.sql` — invitation links, forgot password.
   8. `patch-activity.sql` — updates feed.
   9. `patch-mfa.sql` — two-factor login.
   10. `patch-devtasks.sql` — admin backlog.
   11. `patch-options.sql` — hospitals and companies.
   12. `patch-audit.sql` — admin view-as log.
   13. `patch-location.sql` — clinic address.
   14. `patch-devtasks-assignee.sql` — dev task assignees.
   15. `patch-patient-content.sql` — general surgery info, clinic links, instructional videos ("תוכן למטופלים").
   16. `patch-contact-info.sql` — the patient's "my care team" card: contact name/role/phone, emergency phone, office hours.
   17. `patch-red-flags.sql` — per-template "when to call urgently" clinical content, shown on the patient's journey page.
   18. `patch-clinic-logo.sql` — clinic branding: a logo shown in the header to patients and staff.
   19. `patch-onboarding.sql` — the patient's one-time "how this works" screens.
   20. `patch-privacy-consent.sql` — records the patient's consent to the privacy policy (`/privacy`), separately from having seen the onboarding tutorial. Run after `patch-onboarding.sql`.
   21. `patch-brand-color.sql` — per-clinic accent color.
   22. `patch-brand-theme.sql` — two more per-clinic brand colors (`brand_dark`, `brand_gold`) alongside `brand_color`.
   23. `patch-brand-dark-save.sql` — lets staff save `brand_dark` themselves from the branding form. Run after `patch-brand-theme.sql`.
   24. `patch-name-translations.sql` — lets a clinic's name and a person's own name show in Latin letters when the app isn't in Hebrew.
   25. `patch-clinic-address-self.sql` — lets staff/doctor set their own clinic address, not just the admin.
   26. `patch-template-provenance.sql` — tracks which base template a clinic's copy came from, for the admin "in use by N clinics" count.
   27. `patch-visit-notes.sql` — doctor-only notes on a past appointment: what was discussed, what's needed next.
   28. `patch-referrals.sql` — doctor-written referral letters, printed on the clinic's own letterhead instead of a stamped paper form.
   29. `patch-outcomes.sql` — surgery cancellations with a reason, and when prep first reached 100% — both feed the managers dashboard at `/clinic/insights`.
   30. `patch-doctor-queue.sql` — "questions for the doctor" queue and the per-journey clinical summary. Run after `patch-outcomes.sql`.
   31. `patch-medical-info.sql` — per-patient national ID, HMO and private-insurance details, shown on the patient's own card.
   32. `patch-lang-stage.sql` — the patient's message language (for WhatsApp/email) and a manual status override.
   33. `patch-stage-cancelled.sql` — lets the manual status override be "cancelled" too. Run after `patch-lang-stage.sql`.
   34. `patch-proms.sql` — PROMs: a general-health and a knee-specific questionnaire, collected before surgery and again at 3 months and 1 year after — knee templates only for now; see the file header on question-wording licensing before relying on these for real research.
   35. `patch-multi-journey.sql` — lets a patient have more than one journey — another surgery, in parallel or later.
   36. `patch-referral-results.sql` — closes the loop on a referral: staff marks that the result came back and attaches the file.
   37. `patch-evidence-bucket-limits.sql` — enforces the evidence upload's 10MB/image-or-PDF limits at the storage-bucket level too, not just client-side.
   38. `patch-meeting-summaries.sql` — upgrades the doctor-only visit note into a shared "סיכום פגישה": any staff member can write one, optionally linked to an appointment, and anyone on staff can edit it later.
   39. `patch-social-links.sql` — social media links (Facebook, Instagram, YouTube) shown to patients, one set per clinic.

   Once every patch above is applied, run `patch-performance.sql` **last** — it adds indexes on every foreign key, rewrites every RLS policy to evaluate its function calls once per query instead of once per row, and schedules cleanup of two log tables (requires the `pg_cron` extension — enable it in Dashboard → Database → Extensions if it isn't already).

   Adding a new patch later? Give it its own `insert into _migrations (name) values ('patch-your-new-file.sql') on conflict (name) do nothing;` at the end, matching every patch above.

   To create your admin login, edit and run `supabase/create-admin.sql`, then sign in and open `/admin`.
2. Environment variables (locally in `.env.local`, and in Vercel → Settings → Environment Variables).
   **All three are required in production** — `instrumentation.ts` checks for them at server startup and
   throws immediately (refusing to serve any request) if one is missing, rather than failing silently later:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only; needed so staff can create patient logins)
   - `NEXT_PUBLIC_LOGIN_DOMAIN` (optional, default `medix.local`; not required, so not checked at startup)
3. `npm install && npm run dev`

## Demo logins (password `Medix2026!`)
`dr.cohen` (doctor), `secretary` (staff), patients: `dana`, `avi`, `rina`, `moshe`, `tamar`, `eli`.
Usernames map to `<username>@medix.local` in Supabase Auth.

## Model
- A **template** is a baseline protocol. Starting a journey **copies** it for the patient, so per-patient edits never touch the template.
- A task is `locked` until all tasks it depends on are `accepted`. Upload alone is not completion: staff must accept.
- Readiness = accepted mandatory tasks / all mandatory tasks due on or before surgery.
