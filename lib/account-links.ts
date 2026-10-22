import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/invite";

export const JOIN_LINK_DAYS = 14;
export const RESET_LINK_HOURS = 48;

export async function getOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

type NewLink =
  | { purpose: "patient_join"; clinicId: string; patientId: string; createdBy: string }
  | { purpose: "password_reset"; clinicId: string; userId: string; createdBy: string };

// Creates a one-time link and returns its URL, or an error. Older unused links of the same kind are cancelled,
// so only the newest link works.
export async function createAccountLink(input: NewLink): Promise<{ url: string } | { error: string }> {
  const admin = createAdminClient();
  if (!admin) return { error: "חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת" };

  const target = input.purpose === "patient_join" ? { patient_id: input.patientId } : { user_id: input.userId };
  const [col, val] = Object.entries(target)[0];
  await admin.from("account_links").delete().eq("purpose", input.purpose).eq(col, val).is("used_at", null);

  const token = randomBytes(32).toString("base64url");
  const ms = input.purpose === "patient_join" ? JOIN_LINK_DAYS * 86400000 : RESET_LINK_HOURS * 3600000;
  const { error } = await admin.from("account_links").insert({
    clinic_id: input.clinicId,
    purpose: input.purpose,
    created_by: input.createdBy,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + ms).toISOString(),
    ...target,
  });
  if (error) return { error: "יצירת הקישור נכשלה" };

  const path = input.purpose === "patient_join" ? "join" : "reset";
  return { url: `${await getOrigin()}/${path}/${token}` };
}
