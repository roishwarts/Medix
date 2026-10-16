"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function submitTask(taskId: string, input: { path?: string; name?: string; note?: string }) {
  await requireProfile(["patient"]);
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("journey_tasks")
    .select("id, requires_evidence, requires_review")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "המשימה לא נמצאה" };

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
  if (error) return { error: "לא ניתן לשלוח את המשימה כרגע" };

  revalidatePath("/journey", "layout");
  return {};
}
