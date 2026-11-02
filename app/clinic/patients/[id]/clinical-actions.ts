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
};

// Only the doctor writes the clinical summary; the whole clinic can read it.
export async function saveClinicalSummary(input: ClinicalInput) {
  const t = await getT();
  await requireProfile(["doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_clinical_summary", {
    p_journey: input.journeyId, p_diagnosis: input.diagnosis, p_side: input.side, p_allergies: input.allergies,
    p_medications: input.medications, p_history: input.medicalHistory, p_notes: input.notes,
  });
  if (error) return { error: t("שמירת הסיכום הקליני נכשלה. ודאו שהורצה התוספת supabase/patch-doctor-queue.sql.") };
  revalidatePath("/clinic/patients", "layout");
  return {};
}
