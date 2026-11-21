import { cache } from "react";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAuthUserId } from "./auth";

// "View as" mode for the platform admin: the admin is signed in as another user, read-only, until they exit.
// The cookie only remembers WHO to return to; it is signed so it cannot be forged to gain admin access.
export const IMP_COOKIE = "medix_view_as";
const MAX_AGE_S = 2 * 60 * 60;

export type Impersonation = { admin: string; target: string; name: string; role: string; exp: number };

// Prefer a dedicated signing secret (IMPERSONATION_SECRET) so this HMAC key is not the same value
// as the Supabase service-role key, which grants full database access and is a materially bigger
// secret to have riding on every "view as" cookie. Falls back to the service-role key only until
// IMPERSONATION_SECRET is set (e.g. in Vercel), to avoid invalidating this on a redeploy before
// the new env var exists; once it is set, a stray cookie signed under the old key simply fails
// verification, which is the safe failure mode (the admin just has to start "view as" again).
const key = () => process.env.IMPERSONATION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const mac = (body: string) => createHmac("sha256", key()).update(body).digest("base64url");

export function signImpersonation(p: Omit<Impersonation, "exp">): string | null {
  if (!key()) return null;
  const body = Buffer.from(JSON.stringify({ ...p, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S })).toString("base64url");
  return `${body}.${mac(body)}`;
}

// Checks the signature only (not `exp`). The underlying Supabase session created for "view as"
// (via a magic link) outlives this cookie's own 2-hour budget — nothing here can sign the admin's
// browser out of that session early. So anything that *restricts* access (the read-only write
// block in proxy.ts) must keep treating a signed cookie as active even once it is past `exp`,
// since the real risk is that access that depended on the cookie keeps working after the cookie
// is gone — never that it is blocked for a little too long. Only `verifyImpersonation` below, which
// gates something purely informational (the "view as" banner), should also honor `exp`.
function verifySignature(raw: string | undefined): Impersonation | null {
  if (!raw || !key()) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(mac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as Impersonation;
  } catch {
    return null;
  }
}

// Used where it is safe for an *expired* "view as" cookie to still count (see verifySignature).
export function verifyImpersonationForWriteBlock(raw: string | undefined): Impersonation | null {
  return verifySignature(raw);
}

export function verifyImpersonation(raw: string | undefined): Impersonation | null {
  const p = verifySignature(raw);
  return p && p.exp > Date.now() / 1000 ? p : null;
}

export const IMP_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// The active "view as" session, only if the signed-in user really is the one being viewed.
export const getImpersonation = cache(async (): Promise<Impersonation | null> => {
  const imp = verifyImpersonation((await cookies()).get(IMP_COOKIE)?.value);
  if (!imp) return null;
  return (await getAuthUserId()) === imp.target ? imp : null;
});
