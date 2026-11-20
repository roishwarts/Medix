// Runs once when the server boots (Next.js's instrumentation hook — no config flag needed, stable
// since Next 15). Without this, a missing Supabase env var in production used to fail silently:
// lib/supabase/admin.ts's createAdminClient() just returns null, and the anon client would throw a
// confusing "Invalid URL" deep in a request instead of a clear boot-time error. Crash loudly and
// immediately instead, so a misconfigured deploy never serves a single request.
const REQUIRED_ENV_VARS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export function register() {
  if (process.env.NODE_ENV !== "production") return;
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}. Refusing to start.`);
  }
}
