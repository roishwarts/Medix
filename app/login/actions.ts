"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_DOMAIN } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export async function login(_: { error?: string } | undefined, formData: FormData) {
  const t = await getT();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: t("יש להזין שם משתמש וסיסמה") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@${LOGIN_DOMAIN}`,
    password,
  });
  if (error) {
    return { error: /banned/i.test(error.message) ? t("החשבון הושבת. יש לפנות למנהל.") : t("שם משתמש או סיסמה שגויים") };
  }
  (await cookies()).delete("medix_view_as");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete("medix_view_as");
  redirect("/login");
}
