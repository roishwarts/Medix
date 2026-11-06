"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy";

export async function markOnboarded(): Promise<{ error?: string }> {
  await requireProfile(["patient"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_onboarded");
  // Soft-fail on purpose: if patch-onboarding.sql isn't installed yet, the screens should still
  // dismiss normally rather than trap the patient — they'll just see onboarding again next login.
  if (error) return {};
  return {};
}

// Unlike markOnboarded, this one does NOT soft-fail: it's the record of legal consent, not a UI
// tutorial-seen flag, so a patient must not be let through onboarding on a request that silently
// failed to save.
export async function recordPrivacyConsent(): Promise<{ error?: string }> {
  const t = await getT();
  await requireProfile(["patient"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_privacy_consent", { p_version: PRIVACY_POLICY_VERSION });
  if (error) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-privacy-consent.sql, ונסו שוב.") };
  return {};
}
