"use server";

import { revalidatePath } from "next/cache";
import { getT } from "@/lib/i18n/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ClinicalInput = {
  journeyId: string;
  diagnosis: string;
  side: "" | "left" | "right" | "both";
  allergies: string;
  medications: string;
  medicalHistory: string;
  notes: string;
  // The updated_at this form was loaded with, so the server can detect someone else saved a change
  // in between (patch-clinical-summary-concurrency.sql). Omit/undefined on an install that hasn't
  // run that patch yet - the RPC call below still works without it (falls back to last-write-wins).
  expectedUpdatedAt: string | null;
};

// Only the doctor writes the clinical summary; the whole clinic can read it.
export async function saveClinicalSummary(input: ClinicalInput) {
  const t = await getT();
  await requireProfile(["doctor"]);
  const supabase = await createClient();
  let { error } = await supabase.rpc("save_clinical_summary", {
    p_journey: input.journeyId, p_diagnosis: input.diagnosis, p_side: input.side, p_allergies: input.allergies,
    p_medications: input.medications, p_history: input.medicalHistory, p_notes: input.notes,
    p_expected_updated_at: input.expectedUpdatedAt,
  });
  // p_expected_updated_at is a new parameter (patch-clinical-summary-concurrency.sql): on a
  // database that hasn't run it yet, Postgres has no 8-arg overload and errors "does not exist" -
  // fall back to the old 7-arg call rather than breaking every clinical-summary save until the
  // patch runs. This loses the new conflict check, not the save itself.
  if (error?.message.includes("does not exist")) {
    ({ error } = await supabase.rpc("save_clinical_summary", {
      p_journey: input.journeyId, p_diagnosis: input.diagnosis, p_side: input.side, p_allergies: input.allergies,
      p_medications: input.medications, p_history: input.medicalHistory, p_notes: input.notes,
    }));
  } else if (error) {
    if (error.message.includes("conflict")) {
      return { error: t("מישהו אחר שינה את הסיכום הקליני בזמן שהוא היה פתוח לך. רענון הדף יציג את הגרסה העדכנית.") };
    }
    return { error: t("שמירת הסיכום הקליני נכשלה. ודאו שהורצה התוספת supabase/patch-doctor-queue.sql.") };
  }
  if (error) return { error: t("שמירת הסיכום הקליני נכשלה. ודאו שהורצה התוספת supabase/patch-doctor-queue.sql.") };
  revalidatePath("/clinic/patients", "layout");
  return {};
}
