"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

// Submitting a task now goes through lib/offline/queue.ts's queueOrRun (a direct client call, not
// a Server Action) so it can work offline — see submit-panel.tsx. The logic is identical to what
// used to live here; it just has to run client-side so it exists with no network at all.

export async function submitProms(taskId: string, answers: Record<string, number>) {
  await requireProfile(["patient", "caregiver"]);
  const supabase = await createClient();
  const t = await getT();
  const { error } = await supabase.rpc("submit_proms", { p_task_id: taskId, p_answers: answers });
  if (error) return { error: t("שליחת השאלון נכשלה. ודאו שהורצה התוספת supabase/patch-proms.sql.") };
  revalidatePath("/journey", "layout");
  return {};
}
