"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { EditorTask } from "@/components/editor/types";
import { tasksPayload, validateTasks, type TemplateInput } from "@/lib/template-payload";

export async function saveTemplate(input: TemplateInput): Promise<{ error?: string; id?: string }> {
  await requireProfile(["doctor"]);
  if (!input.name.trim()) return { error: "יש לתת שם לתבנית" };
  const invalid = validateTasks(input.tasks);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_template", {
    p_id: input.id,
    p_name: input.name.trim(),
    p_procedure: input.procedure.trim(),
    p_description: input.description.trim(),
    p_tasks: tasksPayload(input.tasks),
  });
  if (error) return { error: "השמירה נכשלה" };
  revalidatePath("/clinic", "layout");
  return { id: data as string };
}

export async function saveJourneyTasks(input: {
  journeyId: string;
  surgeryDate: string;
  tasks: EditorTask[];
}): Promise<{ error?: string }> {
  await requireProfile(["doctor"]);
  if (!input.surgeryDate) return { error: "יש לבחור תאריך ניתוח" };
  const invalid = validateTasks(input.tasks);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_journey_tasks", {
    p_journey: input.journeyId,
    p_surgery: input.surgeryDate,
    p_tasks: tasksPayload(input.tasks),
  });
  if (error) return { error: "השמירה נכשלה" };
  revalidatePath("/clinic", "layout");
  return {};
}

export async function deleteTemplate(id: string): Promise<{ error?: string }> {
  await requireProfile(["doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) return { error: "המחיקה נכשלה" };
  revalidatePath("/clinic", "layout");
  return {};
}
