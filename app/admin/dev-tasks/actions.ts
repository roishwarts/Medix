"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

type Result = { error?: string };
const STATUSES = ["todo", "doing", "done"] as const;
export type DevStatus = (typeof STATUSES)[number];

const done = (): Result => {
  revalidatePath("/admin/dev-tasks");
  return {};
};

export async function addSubject(title: string): Promise<Result> {
  const { db } = await requireAdmin();
  const t = title.trim();
  if (!t) return { error: "יש להזין שם לנושא" };
  const { error } = await db.from("dev_subjects").insert({ title: t.slice(0, 120) });
  return error ? { error: "ההוספה נכשלה" } : done();
}

export async function deleteSubject(id: string): Promise<Result> {
  const { db } = await requireAdmin();
  const { error } = await db.from("dev_subjects").delete().eq("id", id);
  return error ? { error: "המחיקה נכשלה" } : done();
}

export async function addTask(subjectId: string, title: string): Promise<Result> {
  const { db } = await requireAdmin();
  const t = title.trim();
  if (!t) return { error: "יש להזין משימה" };
  const { error } = await db.from("dev_tasks").insert({ subject_id: subjectId, title: t.slice(0, 300) });
  return error ? { error: "ההוספה נכשלה" } : done();
}

export async function updateTask(id: string, title: string, notes: string): Promise<Result> {
  const { db } = await requireAdmin();
  const t = title.trim();
  if (!t) return { error: "יש להזין משימה" };
  const { error } = await db.from("dev_tasks").update({ title: t.slice(0, 300), notes: notes.trim().slice(0, 2000) || null }).eq("id", id);
  return error ? { error: "העדכון נכשל" } : done();
}

export async function setTaskStatus(id: string, status: DevStatus): Promise<Result> {
  const { db } = await requireAdmin();
  if (!STATUSES.includes(status)) return { error: "סטטוס לא תקין" };
  const { error } = await db
    .from("dev_tasks")
    .update({ status, done_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id);
  return error ? { error: "העדכון נכשל" } : done();
}

export async function deleteTask(id: string): Promise<Result> {
  const { db } = await requireAdmin();
  const { error } = await db.from("dev_tasks").delete().eq("id", id);
  return error ? { error: "המחיקה נכשלה" } : done();
}
