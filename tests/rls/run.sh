#!/usr/bin/env bash
# Builds a throwaway database from supabase/schema.sql + every patch in the README order, then runs the
# row-level-security tests (tests/rls/*.test.sql). Needs a Postgres reachable with the usual PG* variables
# (or PGHOST/PGPORT/PGUSER). Usage:  tests/rls/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${RLS_DB:-rls_test}"
export PGDATABASE=postgres
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" -c "drop database if exists $DB with (force)" -c "create database $DB"
export PGDATABASE="$DB"

"${PSQL[@]}" -f tests/rls/bootstrap.sql
"${PSQL[@]}" -f supabase/schema.sql
# The patches, in the order the README gives (the order matters: later ones redefine earlier functions).
grep -o '`patch-[a-z0-9-]*\.sql`' README.md | tr -d '`' | awk '!seen[$0]++' | while read -r f; do
  echo "patch: $f"
  # pg_cron is a Supabase extension that a plain Postgres lacks: bootstrap.sql provides a stand-in cron.schedule().
  sed '/^create extension if not exists pg_cron;/d' "supabase/$f" | "${PSQL[@]}"
done

# RLS_PRE_TEST_SQL lets you break something on purpose, to prove the tests notice (e.g. "alter table patients disable row level security").
if [ -n "${RLS_PRE_TEST_SQL:-}" ]; then "${PSQL[@]}" -c "$RLS_PRE_TEST_SQL"; fi

status=0
for t in tests/rls/*.test.sql; do
  echo "test: $t"
  "${PSQL[@]}" -f "$t" || status=1
done
exit $status
