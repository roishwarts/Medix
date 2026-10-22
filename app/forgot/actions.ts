"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { LOGIN_DOMAIN } from "@/lib/auth";

export type ForgotState = { error?: string; sent?: boolean } | undefined;

// Patients and caregivers ask the clinic for a reset link. The answer never reveals whether the username exists.
export async function requestPasswordReset(_: ForgotState, formData: FormData): Promise<ForgotState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!username) return { error: "יש להזין שם משתמש" };

  const admin = createAdminClient();
  if (admin && /^[a-z0-9._-]{3,30}$/.test(username)) {
    const { data: uid } = await admin.rpc("admin_user_by_email", { p_email: `${username}@${LOGIN_DOMAIN}` });
    if (uid) {
      const { data: profile } = await admin
        .from("profiles")
        .select("clinic_id, full_name, role, disabled")
        .eq("id", uid)
        .in("role", ["patient", "caregiver"])
        .maybeSingle();
      if (profile && !profile.disabled) {
        // A second open request for the same user is ignored (unique index).
        await admin.from("password_reset_requests").insert({
          clinic_id: profile.clinic_id,
          user_id: uid,
          full_name: profile.full_name,
          role: profile.role,
        });
      }
    }
  }
  return { sent: true };
}
