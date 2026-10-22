"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/invite";

export type ResetState = { error?: string } | undefined;

export async function setNewPassword(token: string, _: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "הסיסמה צריכה להכיל לפחות 8 תווים" };

  const admin = createAdminClient();
  if (!admin) return { error: "האיפוס אינו זמין כרגע. פנה/י למרפאה." };

  const { data: link } = await admin
    .from("account_links")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .eq("purpose", "password_reset")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id, user_id")
    .maybeSingle();
  if (!link?.user_id) return { error: "הקישור אינו תקף או שכבר נוצל. בקש/י מהמרפאה קישור חדש." };

  const { data: updated, error } = await admin.auth.admin.updateUserById(link.user_id, { password });
  if (error || !updated.user) {
    await admin.from("account_links").update({ used_at: null }).eq("id", link.id);
    return { error: "עדכון הסיסמה נכשל. נסה/י שוב." };
  }

  const supabase = await createClient();
  const { error: signErr } = await supabase.auth.signInWithPassword({ email: updated.user.email!, password });
  if (signErr) redirect("/login");
  redirect("/");
}
