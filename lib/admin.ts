import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

// The platform owner. Checked on the server with the service role; no database policy exposes this table.
export const getPlatformAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const db = createAdminClient();
  if (!db) return null;
  const { data: row } = await db.from("platform_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return row ? { userId: data.user.id, db } : null;
});

export async function requireAdmin() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect("/");
  return admin;
}
