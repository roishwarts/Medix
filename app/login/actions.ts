"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_DOMAIN } from "@/lib/auth";

export async function login(_: { error?: string } | undefined, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "יש להזין שם משתמש וסיסמה" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@${LOGIN_DOMAIN}`,
    password,
  });
  if (error) return { error: "שם משתמש או סיסמה שגויים" };
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
