import { findCycle, type EditorTask } from "@/components/editor/types";
import { israelLocalToIso } from "@/lib/dates";
import type { T } from "@/lib/i18n";

const plain: T = (text, params) => (params ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? "")) : text);

export function validateTasks(tasks: EditorTask[], t: T = plain): string | null {
  return validateTasksDetailed(tasks, t)?.error ?? null;
}

// Same validation, but also names the offending task so the UI can open and highlight it.
export function validateTasksDetailed(tasks: EditorTask[], t: T = plain): { error: string; taskId?: string } | null {
  if (tasks.length === 0) return { error: t("יש להוסיף לפחות משימה אחת") };
  const missing = tasks.find((x) => !x.title.trim());
  if (missing) return { error: t("לכל משימה צריכה להיות כותרת"), taskId: missing.id };
  const cycleId = findCycle(tasks);
  if (cycleId) {
    const cycleTask = tasks.find((x) => x.id === cycleId);
    return { error: t("יש תלות מעגלית סביב \"{title}\"", { title: cycleTask?.title || t("משימה") }), taskId: cycleId };
  }
  return null;
}

export function tasksPayload(tasks: EditorTask[]) {
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

export type TemplateInput = {
  id: string | null;
  name: string;
  procedure: string;
  description: string;
  tasks: EditorTask[];
};
