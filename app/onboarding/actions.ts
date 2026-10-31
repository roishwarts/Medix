"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function markOnboarded(): Promise<{ error?: string }> {
  await requireProfile(["patient"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_onboarded");
  // Soft-fail on purpose: if patch-onboarding.sql isn't installed yet, the screens should still
  // dismiss normally rather than trap the patient — they'll just see onboarding again next login.
  if (error) return {};
  return {};
}
