"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export async function submitTask(taskId: string, input: { path?: string; name?: string; note?: string }) {
  await requireProfile(["patient", "caregiver"]);
  const supabase = await createClient();
  const t = await getT();

  const { data: task } = await supabase
    .from("journey_tasks")
    .select("id, requires_evidence, requires_review")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: t("המשימה לא נמצאה") };

  const needsReview = task.requires_evidence || task.requires_review;
  const { error } = await supabase
    .from("journey_tasks")
    .update({
      status: needsReview ? "submitted" : "accepted",
      evidence_path: input.path ?? null,
      evidence_name: input.name ?? null,
      patient_note: input.note?.trim() || null,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", taskId);
  if (error) return { error: t("לא ניתן לשלוח את המשימה כרגע") };

  revalidatePath("/journey", "layout");
  return {};
}

export async function submitProms(taskId: string, answers: Record<string, number>) {
  await requireProfile(["patient", "caregiver"]);
  const supabase = await createClient();
  const t = await getT();
  const { error } = await supabase.rpc("submit_proms", { p_task_id: taskId, p_answers: answers });
  if (error) return { error: t("שליחת השאלון נכשלה. ודאו שהורצה התוספת supabase/patch-proms.sql.") };
  revalidatePath("/journey", "layout");
  return {};
}
