"use server";

import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type MeetingSummaryInput = {
  id?: string;
  patientId: string;
  journeyTaskId: string | null;
  occurredAt: string; // ISO
  note: string;
  followUp: string;
};

// Staff-wide: any doctor or secretary can write or edit a meeting summary, not just the one who
// wrote it originally.
export async function saveMeetingSummary(input: MeetingSummaryInput) {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  if (!input.note.trim()) return { error: t("יש לכתוב מה נדון בפגישה") };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_meeting_summary", {
    p_id: input.id ?? null,
    p_patient_id: input.patientId,
    p_journey_task_id: input.journeyTaskId,
    p_occurred_at: input.occurredAt,
    p_note: input.note,
    p_follow_up: input.followUp,
  });
  if (error) return { error: t("שמירת הסיכום נכשלה. ודאו שהורצה התוספת supabase/patch-meeting-summaries.sql.") };
  revalidatePath("/clinic/patients", "layout");
  return {};
}

export async function deleteMeetingSummary(id: string) {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_meeting_summary", { p_id: id });
  if (error) return { error: t("המחיקה נכשלה") };
  revalidatePath("/clinic/patients", "layout");
  return {};
}
