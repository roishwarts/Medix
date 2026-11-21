-- Tracks which of the patch-*.sql files below have actually been run against this database, so
-- "which patches are applied here" is a query instead of tribal knowledge. Every patch-*.sql file
-- ends with an insert into this table recording its own name; run this one FIRST, before any other
-- patch (patches after this one all assume the table exists). Safe to re-run.
--
-- To check what's applied: select name, applied_at from _migrations order by applied_at;
-- To see what's listed in README.md but NOT yet applied here, compare that query's output against
-- the README's patch list by hand (there's no automated diff - see README for the full order).

create table if not exists _migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

-- Closed to everyone except the database owner and the service role: this lives in the public schema, which
-- the API exposes, so without this anyone holding the public anon key could read (or write) the list.
alter table _migrations enable row level security;
revoke all on _migrations from anon, authenticated;

-- Records that this patch ran, for _migrations-table.sql's applied-patches query.
insert into _migrations (name) values ('patch-migrations-table.sql') on conflict (name) do nothing;
