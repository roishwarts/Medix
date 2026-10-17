# Medix (v0)

Patient journey execution layer: turns a doctor's protocol into a workflow with dependencies, readiness and blockers.
Hebrew-only, RTL. Stack: Next.js (App Router) + Supabase (Auth, Postgres + RLS, Storage).

## Setup
1. Supabase SQL editor: run `supabase/schema.sql`, then `supabase/seed.sql` (demo data only).
   Then run `supabase/patch-calendar.sql` (appointments + calendar; safe to re-run).
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
