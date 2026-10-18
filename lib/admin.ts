import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "./supabase/admin";
import { getAuthUserId } from "./auth";

// The platform owner. Checked on the server with the service role; no database policy exposes this table.
export const getPlatformAdmin = cache(async () => {
  const userId = await getAuthUserId();
  if (!userId) return null;
  const db = createAdminClient();
  if (!db) return null;
  const { data: row } = await db.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return row ? { userId, db } : null;
});

export async function requireAdmin() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect("/");
  return admin;
}
