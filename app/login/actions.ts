"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_DOMAIN } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

// A small, process-local brake on password guessing. It is intentionally not a real rate limiter:
// each serverless instance keeps its own counts and a redeploy/cold start clears them, so it cannot
// be relied on alone. It exists to blunt a trivial scripted guesser between Supabase Auth's own
// platform-level throttling kicking in, without adding a database or external store for this. The
// map is bounded so it cannot grow without limit under a real attack.
const ATTEMPTS = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const MAX_TRACKED_KEYS = 5000;

// Only wrong passwords count: a successful sign-in clears the counter, so people sharing one connection
// (a clinic, a hospital) and signing in and out are never locked out by their own correct logins.
function isLocked(key: string): boolean {
  const entry = ATTEMPTS.get(key);
  return !!entry && entry.resetAt >= Date.now() && entry.count >= MAX_ATTEMPTS;
}
function recordFailure(key: string) {
  const now = Date.now();
  const entry = ATTEMPTS.get(key);
  if (!entry || entry.resetAt < now) {
    if (ATTEMPTS.size >= MAX_TRACKED_KEYS) ATTEMPTS.clear();
    ATTEMPTS.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export async function login(_: { error?: string } | undefined, formData: FormData) {
  const t = await getT();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: t("יש להזין שם משתמש וסיסמה") };

  // Keyed by username + caller IP, so one slow typist on one connection never blocks someone else,
  // but a script trying many passwords against one account (or many accounts from one IP) does.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bruteKey = `${username}:${ip}`;
  if (isLocked(bruteKey)) {
    return { error: t("יותר מדי ניסיונות כניסה. נסה/י שוב בעוד כמה דקות.") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@${LOGIN_DOMAIN}`,
    password,
  });
  if (error) {
    recordFailure(bruteKey);
    return { error: /banned/i.test(error.message) ? t("החשבון הושבת. יש לפנות למנהל.") : t("שם משתמש או סיסמה שגויים") };
  }
  ATTEMPTS.delete(bruteKey);
  (await cookies()).delete("medix_view_as");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete("medix_view_as");
  redirect("/login");
}
