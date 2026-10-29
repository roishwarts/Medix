import { cache } from "react";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAuthUserId } from "./auth";

// "View as" mode for the platform admin: the admin is signed in as another user, read-only, until they exit.
// The cookie only remembers WHO to return to; it is signed so it cannot be forged to gain admin access.
export const IMP_COOKIE = "medix_view_as";
const MAX_AGE_S = 2 * 60 * 60;

export type Impersonation = { admin: string; target: string; name: string; role: string; exp: number };

const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const mac = (body: string) => createHmac("sha256", key()).update(body).digest("base64url");

export function signImpersonation(p: Omit<Impersonation, "exp">): string | null {
  if (!key()) return null;
  const body = Buffer.from(JSON.stringify({ ...p, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S })).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function verifyImpersonation(raw: string | undefined): Impersonation | null {
  if (!raw || !key()) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(mac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Impersonation;
    return p.exp > Date.now() / 1000 ? p : null;
  } catch {
    return null;
  }
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
