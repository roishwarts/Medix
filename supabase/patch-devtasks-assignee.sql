-- Assignees for the admin dev tasks backlog: a list of people you maintain in the app, and one per task. Safe to re-run.
-- Only the server (service role) reads these; RLS stays on with no policies.
create table if not exists dev_people (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table dev_people enable row level security;

-- Removing a person leaves their tasks unassigned.
alter table dev_tasks add column if not exists assignee_id uuid references dev_people(id) on delete set null;
create index if not exists dev_tasks_assignee on dev_tasks(assignee_id);
