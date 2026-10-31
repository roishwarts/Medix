# Medix (v0)

Patient journey execution layer: turns a doctor's protocol into a workflow with dependencies, readiness and blockers.
Hebrew-only, RTL. Stack: Next.js (App Router) + Supabase (Auth, Postgres + RLS, Storage).

## Setup
1. Supabase SQL editor: run `supabase/schema.sql`, then `supabase/seed.sql` (demo data only).
   Then run `supabase/patch-calendar.sql` (appointments + calendar) and `supabase/patch-caregivers.sql` (family access), then `supabase/patch-admin.sql` (admin panel) `supabase/patch-staff-edit.sql` (secretary can edit a journey) `supabase/patch-invitations.sql` (invitation links, forgot password) `supabase/patch-activity.sql` (updates feed) `supabase/patch-mfa.sql` (two-factor login) `supabase/patch-devtasks.sql` (admin backlog) and `supabase/patch-options.sql` (hospitals and companies) and `supabase/patch-audit.sql` (admin view-as log) and `supabase/patch-location.sql` (clinic address) and `supabase/patch-devtasks-assignee.sql` (dev task assignees) and `supabase/patch-patient-content.sql` (general surgery info, clinic links, instructional videos — "תוכן למטופלים") and `supabase/patch-contact-info.sql` (the patient's "my care team" card: contact name/role/phone, emergency phone, office hours) and `supabase/patch-red-flags.sql` (per-template "when to call urgently" clinical content, shown on the patient's journey page) and `supabase/patch-clinic-logo.sql` (clinic branding: a logo shown in the header to patients and staff) and `supabase/patch-onboarding.sql` (the patient's one-time "how this works" screens) and `supabase/patch-brand-color.sql` (per-clinic accent color) and `supabase/patch-clinic-address-self.sql` (lets staff/doctor set their own clinic address, not just the admin) and `supabase/patch-template-provenance.sql` (tracks which base template a clinic's copy came from, for the admin "in use by N clinics" count), in that order. All are safe to re-run.
   To create your admin login, edit and run `supabase/create-admin.sql`, then sign in and open `/admin`.
2. Environment variables (locally in `.env.local`, and in Vercel → Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only; needed so staff can create patient logins)
   - `NEXT_PUBLIC_LOGIN_DOMAIN` (optional, default `medix.local`)
3. `npm install && npm run dev`

## Demo logins (password `Medix2026!`)
`dr.cohen` (doctor), `secretary` (staff), patients: `dana`, `avi`, `rina`, `moshe`, `tamar`, `eli`.
Usernames map to `<username>@medix.local` in Supabase Auth.

## Model
- A **template** is a baseline protocol. Starting a journey **copies** it for the patient, so per-patient edits never touch the template.
- A task is `locked` until all tasks it depends on are `accepted`. Upload alone is not completion: staff must accept.
- Readiness = accepted mandatory tasks / all mandatory tasks due on or before surgery.
