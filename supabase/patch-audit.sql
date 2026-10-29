-- Log of the platform admin viewing the system as another user. Safe to re-run.
-- Only the server (service role) reads and writes it; RLS stays on with no policies.
create table if not exists admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  target_user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created on admin_audit(created_at desc);
alter table admin_audit enable row level security;
