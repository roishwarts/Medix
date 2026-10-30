"use server";

import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { tasksPayload, validateTasks, type TemplateInput } from "@/lib/template-payload";

export async function saveBaseTemplate(input: TemplateInput): Promise<{ error?: string; id?: string }> {
  const t = await getT();
  const { db } = await requireAdmin();
  if (!input.name.trim()) return { error: t("יש לתת שם לתבנית") };
  const invalid = validateTasks(input.tasks, await getT());
  if (invalid) return { error: invalid };

  const { data, error } = await db.rpc("admin_save_template", {
    p_id: input.id,
    p_name: input.name.trim(),
    p_procedure: input.procedure.trim(),
    p_description: input.description.trim(),
    p_tasks: tasksPayload(input.tasks),
  });
  if (error) return { error: t("השמירה נכשלה") };
  revalidatePath("/admin", "layout");
  return { id: data as string };
}

// Clinics keep their own copies, so removing a base template never affects them.
export async function deleteBaseTemplate(id: string): Promise<{ error?: string }> {
  const t = await getT();
  const { db } = await requireAdmin();
  const { error } = await db.from("templates").delete().eq("id", id).eq("is_base", true);
  if (error) return { error: t("המחיקה נכשלה") };
  revalidatePath("/admin", "layout");
  return {};
}
