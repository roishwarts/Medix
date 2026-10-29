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

const NEEDS_PATCH = "השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-devtasks-assignee.sql.";

export async function addTask(subjectId: string, title: string, assigneeId?: string | null): Promise<Result> {
  const { db } = await requireAdmin();
  const t = title.trim();
  if (!t) return { error: "יש להזין משימה" };
  const { error } = await db.from("dev_tasks").insert({ subject_id: subjectId, title: t.slice(0, 300), ...(assigneeId ? { assignee_id: assigneeId } : {}) });
  return error ? { error: assigneeId ? NEEDS_PATCH : "ההוספה נכשלה" } : done();
}

// assigneeId: undefined leaves the assignee as it is, null clears it.
export async function updateTask(id: string, title: string, notes: string, assigneeId?: string | null): Promise<Result> {
  const { db } = await requireAdmin();
  const t = title.trim();
  if (!t) return { error: "יש להזין משימה" };
  const { error } = await db
    .from("dev_tasks")
    .update({ title: t.slice(0, 300), notes: notes.trim().slice(0, 2000) || null, ...(assigneeId !== undefined ? { assignee_id: assigneeId } : {}) })
    .eq("id", id);
  return error ? { error: assigneeId !== undefined ? NEEDS_PATCH : "העדכון נכשל" } : done();
}

export async function setTaskAssignee(id: string, assigneeId: string | null): Promise<Result> {
  const { db } = await requireAdmin();
  const { error } = await db.from("dev_tasks").update({ assignee_id: assigneeId }).eq("id", id);
  return error ? { error: NEEDS_PATCH } : done();
}

export async function addPerson(name: string): Promise<Result> {
  const { db } = await requireAdmin();
  const n = name.trim().replace(/\s+/g, " ");
  if (!n) return { error: "יש להזין שם" };
  if (n.length > 40) return { error: "השם ארוך מדי" };
  const { error } = await db.from("dev_people").insert({ name: n });
  if (error) return { error: error.code === "23505" || /duplicate|unique/i.test(error.message) ? "השם כבר קיים" : NEEDS_PATCH };
  return done();
}

export async function removePerson(id: string): Promise<Result> {
  const { db } = await requireAdmin();
  const { error } = await db.from("dev_people").delete().eq("id", id);
  return error ? { error: "המחיקה נכשלה" } : done();
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
