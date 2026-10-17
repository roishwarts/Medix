"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { findCycle, type EditorTask } from "@/components/editor/types";
import { israelLocalToIso } from "@/lib/dates";

function validate(tasks: EditorTask[]): string | null {
  if (tasks.length === 0) return "יש להוסיף לפחות משימה אחת";
  if (tasks.some((t) => !t.title.trim())) return "לכל משימה צריכה להיות כותרת";
  const cycle = findCycle(tasks);
  if (cycle) return `יש תלות מעגלית סביב "${cycle}"`;
  return null;
}

function payload(tasks: EditorTask[]) {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title.trim(),
    description: t.description.trim(),
    owner: t.owner,
    due_offset_days: t.due_offset_days,
    requires_evidence: t.requires_evidence,
    requires_review: t.requires_review || t.requires_evidence,
    mandatory: t.mandatory,
    depends_on: t.depends_on,
    kind: t.kind,
    location: t.kind === "appointment" ? t.location.trim() : "",
    scheduled_at:
      t.kind === "appointment" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t.scheduled_local)
        ? israelLocalToIso(t.scheduled_local)
        : null,
  }));
}

export async function saveTemplate(input: {
  id: string | null;
  name: string;
  procedure: string;
  description: string;
  tasks: EditorTask[];
}): Promise<{ error?: string; id?: string }> {
  await requireProfile(["doctor"]);
  if (!input.name.trim()) return { error: "יש לתת שם לתבנית" };
  const invalid = validate(input.tasks);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_template", {
    p_id: input.id,
    p_name: input.name.trim(),
    p_procedure: input.procedure.trim(),
    p_description: input.description.trim(),
    p_tasks: payload(input.tasks),
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
  const invalid = validate(input.tasks);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_journey_tasks", {
    p_journey: input.journeyId,
    p_surgery: input.surgeryDate,
    p_tasks: payload(input.tasks),
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
