"use server";

import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

const NEEDS_PATCH = "השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-devtasks-assignee.sql.";
type Result = { error?: string };
const STATUSES = ["todo", "doing", "done"] as const;
export type DevStatus = (typeof STATUSES)[number];

const done = (): Result => {
  revalidatePath("/admin/dev-tasks");
  return {};
};

export async function addSubject(title: string): Promise<Result> {
  const t = await getT();
  const { db } = await requireAdmin();
  const name = title.trim();
  if (!name) return { error: t("יש להזין שם לנושא") };
  const { error } = await db.from("dev_subjects").insert({ title: name.slice(0, 120) });
  return error ? { error: t("ההוספה נכשלה") } : done();
}

export async function deleteSubject(id: string): Promise<Result> {
  const t = await getT();
  const { db } = await requireAdmin();
  const { error } = await db.from("dev_subjects").delete().eq("id", id);
  return error ? { error: t("המחיקה נכשלה") } : done();
}


export async function addTask(subjectId: string, title: string, assigneeId?: string | null): Promise<Result> {
  const t = await getT();
  const { db } = await requireAdmin();
  const name = title.trim();
  if (!name) return { error: t("יש להזין משימה") };
  const { error } = await db.from("dev_tasks").insert({ subject_id: subjectId, title: name.slice(0, 300), ...(assigneeId ? { assignee_id: assigneeId } : {}) });
  return error ? { error: assigneeId ? t(NEEDS_PATCH) : t("ההוספה נכשלה") } : done();
}

// assigneeId: undefined leaves the assignee as it is, null clears it.
export async function updateTask(id: string, title: string, notes: string, assigneeId?: string | null): Promise<Result> {
  const t = await getT();
  const { db } = await requireAdmin();
  const name = title.trim();
  if (!name) return { error: t("יש להזין משימה") };
  const { error } = await db
    .from("dev_tasks")
    .update({ title: name.slice(0, 300), notes: notes.trim().slice(0, 2000) || null, ...(assigneeId !== undefined ? { assignee_id: assigneeId } : {}) })
    .eq("id", id);
  return error ? { error: assigneeId !== undefined ? t(NEEDS_PATCH) : t("העדכון נכשל") } : done();
}

export async function setTaskAssignee(id: string, assigneeId: string | null): Promise<Result> {
  const t = await getT();
  const { db } = await requireAdmin();
  const { error } = await db.from("dev_tasks").update({ assignee_id: assigneeId }).eq("id", id);
  return error ? { error: t(NEEDS_PATCH) } : done();
}

export async function addPerson(name: string): Promise<Result> {
  const t = await getT();
  const { db } = await requireAdmin();
  const n = name.trim().replace(/\s+/g, " ");
  if (!n) return { error: t("יש להזין שם") };
  if (n.length > 40) return { error: t("השם ארוך מדי") };
  const { error } = await db.from("dev_people").insert({ name: n });
  if (error) return { error: error.code === "23505" || /duplicate|unique/i.test(error.message) ? t("השם כבר קיים") : NEEDS_PATCH };
  return done();
}

export async function removePerson(id: string): Promise<Result> {
  const t = await getT();
  const { db } = await requireAdmin();
  const { error } = await db.from("dev_people").delete().eq("id", id);
  return error ? { error: t("המחיקה נכשלה") } : done();
}

export async function setTaskStatus(id: string, status: DevStatus): Promise<Result> {
  const t = await getT();
  const { db } = await requireAdmin();
  if (!STATUSES.includes(status)) return { error: t("סטטוס לא תקין") };
  const { error } = await db
    .from("dev_tasks")
    .update({ status, done_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id);
  return error ? { error: t("העדכון נכשל") } : done();
}

export async function deleteTask(id: string): Promise<Result> {
  const t = await getT();
  const { db } = await requireAdmin();
  const { error } = await db.from("dev_tasks").delete().eq("id", id);
  return error ? { error: t("המחיקה נכשלה") } : done();
}
