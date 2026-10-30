"use server";

import { getT } from "@/lib/i18n/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { IMP_COOKIE, IMP_COOKIE_OPTIONS, signImpersonation } from "@/lib/impersonation";

const VIEWABLE = ["doctor", "staff", "patient", "caregiver"];

// Signs the admin in as another user to see the system through their eyes (read-only, logged).
export async function startViewAs(targetId: string): Promise<{ error?: string }> {
  const t = await getT();
  const { db, userId } = await requireAdmin();

  const { data: target } = await db.from("profiles").select("id, role, full_name, disabled, clinic_id").eq("id", targetId).maybeSingle();
  if (!target || !VIEWABLE.includes(target.role)) return { error: t("אי אפשר לצפות כמשתמש הזה") };
  if (target.disabled) return { error: t("המשתמש מושבת") };

  if (target.role === "staff" || target.role === "doctor") {
    const { data: clinic } = await db.from("clinics").select("*").eq("id", target.clinic_id).maybeSingle();
    if (clinic?.mfa_required) return { error: t("המרפאה דורשת אימות דו-שלבי, ולכן אי אפשר לצפות כאחד מאנשי הצוות שלה. כבו זמנית את האימות הדו-שלבי בכרטיס המרפאה.") };
  }

  const { data: authUser } = await db.auth.admin.getUserById(targetId);
  const email = authUser.user?.email;
  if (!email) return { error: t("המשתמש לא נמצא") };

  const cookieValue = signImpersonation({ admin: userId, target: targetId, name: target.full_name, role: target.role });
  if (!cookieValue) return { error: t("חסר מפתח שרת לצפייה כמשתמש") };

  const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email });
  const hash = link?.properties?.hashed_token;
  if (!hash) return { error: t("יצירת הכניסה נכשלה") };

  // Record who looked at whose account. Best effort until supabase/patch-audit.sql has been run.
  await db.from("admin_audit").insert({ admin_id: userId, target_user_id: targetId, action: "view_as_start" });

  const jar = await cookies();
  jar.set(IMP_COOKIE, cookieValue, IMP_COOKIE_OPTIONS);
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: hash, type: "magiclink" });
  if (error) {
    jar.delete(IMP_COOKIE);
    return { error: t("הכניסה כמשתמש נכשלה") };
  }
  redirect("/");
}
