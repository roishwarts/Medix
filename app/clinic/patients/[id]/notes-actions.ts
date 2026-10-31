"use server";

import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Doctor-only: visit notes are clinical content about what was discussed, kept out of reach of
// staff and patients by RLS (there is no select policy for anyone else on visit_notes).
export async function saveVisitNote(taskId: string, note: string) {
  const t = await getT();
  await requireProfile(["doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_visit_note", { p_task_id: taskId, p_note: note });
  if (error) return { error: t("שמירת ההערה נכשלה") };
  revalidatePath("/clinic/patients", "layout");
  return {};
}
