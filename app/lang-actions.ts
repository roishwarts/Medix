"use server";

import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lang } from "@/lib/prefs";

// When a patient picks a language in the app, remember it, so the clinic's WhatsApp and email messages use it.
export async function saveMyLanguage(lang: Lang): Promise<void> {
  if (!(["he", "en", "ru", "ar"] as const).includes(lang)) return;
  const profile = await getProfile();
  if (profile?.role !== "patient") return;
  // Patients cannot edit their own row under the security rules, and the role was checked above.
  const admin = createAdminClient();
  await admin?.from("patients").update({ lang }).eq("user_id", profile.id);
}
