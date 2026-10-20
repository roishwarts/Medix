import { addDays, diffDays, israelParts, today as getToday } from "./dates";

export type Owner = "patient" | "staff" | "doctor";
export type Status = "pending" | "submitted" | "accepted" | "rejected";

export type TaskRow = {
  id: string;
  journey_id: string;
  title: string;
  description: string | null;
  owner: Owner;
  due_offset_days: number;
  requires_evidence: boolean;
  requires_review: boolean;
  mandatory: boolean;
  position: number;
  depends_on: string[];
  status: Status;
  kind: "task" | "appointment";
  location: string | null;
  scheduled_at: string | null;
  evidence_path: string | null;
  evidence_name: string | null;
  patient_note: string | null;
  review_note: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

// done: accepted. locked: waiting on other tasks. review: submitted, waiting for the clinic.
// rejected: sent back to whoever owns it. todo: open and actionable.
export type TaskState = "done" | "locked" | "review" | "rejected" | "todo";

export type Task = TaskRow & {
  dueDate: string;
  // When it happens: the scheduled appointment time if set, otherwise the deadline.
  eventDate: string;
  eventTime: string | null;
  state: TaskState;
  overdue: boolean;
  blockedBy: TaskRow[];
  preop: boolean;
};

export type Blocker = {
  task: Task;
  kind: "overdue" | "rejected" | "review" | "clinic" | "todo";
  label: string;
};

export type Readiness = "ready" | "in_progress" | "not_ready";

export type JourneySummary = {
  tasks: Task[];
  readiness: number;
  readinessState: Readiness;
  blockers: Blocker[];
  topBlocker: Blocker | null;
  daysToSurgery: number;
};

export const OWNER_LABEL: Record<Owner, string> = {
  patient: "המטופל",
  staff: "הצוות",
  doctor: "הרופא",
};

export function computeTasks(rows: TaskRow[], surgeryDate: string, today = getToday()): Task[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return rows
    .map((r): Task => {
      const dueDate = addDays(surgeryDate, -r.due_offset_days);
      const blockedBy = r.depends_on
        .map((id) => byId.get(id))
        .filter((d): d is TaskRow => !!d && d.status !== "accepted");
      let state: TaskState;
      if (r.status === "accepted") state = "done";
      else if (blockedBy.length > 0) state = "locked";
      else if (r.status === "submitted") state = "review";
      else if (r.status === "rejected") state = "rejected";
      else state = "todo";
      const sched = r.scheduled_at ? israelParts(r.scheduled_at) : null;
      const eventDate = sched?.date ?? dueDate;
      const when = r.kind === "appointment" ? eventDate : dueDate;
      return {
        ...r,
        dueDate,
        eventDate,
        eventTime: sched?.time ?? null,
        state,
        overdue: (state === "todo" || state === "rejected") && when < today,
        blockedBy,
        preop: r.due_offset_days >= 0,
      };
    })
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.position - b.position));
}

export function summarize(rows: TaskRow[], surgeryDate: string, today = getToday()): JourneySummary {
  const tasks = computeTasks(rows, surgeryDate, today);
  // Readiness counts mandatory pre-surgery tasks only.
  const required = tasks.filter((t) => t.mandatory && t.preop);
  const done = required.filter((t) => t.state === "done").length;
  const readiness = required.length === 0 ? 100 : Math.round((done / required.length) * 100);

  const blockers: Blocker[] = [];
  for (const t of required) {
    if (t.state === "done" || t.state === "locked") continue;
    if (t.overdue) {
      blockers.push({
        task: t,
        kind: "overdue",
        label: `${t.title} – באיחור (${OWNER_LABEL[t.owner]})`,
      });
    } else if (t.state === "rejected") {
      blockers.push({ task: t, kind: "rejected", label: `${t.title} – הוחזר לתיקון` });
    } else if (t.state === "review") {
      blockers.push({ task: t, kind: "review", label: `${t.title} – ממתין לבדיקה` });
    } else if (t.owner !== "patient") {
      blockers.push({ task: t, kind: "clinic", label: `${t.title} – ממתין ל${OWNER_LABEL[t.owner]}` });
    } else {
      blockers.push({ task: t, kind: "todo", label: `${t.title} – ממתין למטופל` });
    }
  }
  const rank = { overdue: 0, rejected: 1, review: 2, clinic: 3, todo: 4 } as const;
  blockers.sort(
    (a, b) => rank[a.kind] - rank[b.kind] || (a.task.dueDate < b.task.dueDate ? -1 : 1),
  );

  const readinessState: Readiness =
    readiness === 100 ? "ready" : blockers.some((b) => b.kind === "overdue") ? "not_ready" : "in_progress";

  return {
    tasks,
    readiness,
    readinessState,
    blockers,
    topBlocker: blockers[0] ?? null,
    daysToSurgery: diffDays(surgeryDate, today),
  };
}

// What the patient should do right now.
export function nowTask(tasks: Task[]): Task | null {
  return (
    tasks.find((t) => t.owner === "patient" && (t.state === "todo" || t.state === "rejected")) ?? null
  );
}

// ---- clinic action items ("this week")

export type ActionKind = "review" | "overdue" | "clinic" | "upcoming";
export type ActionItem = {
  kind: ActionKind;
  task: Task;
  patientId: string;
  patientName: string;
  surgeryDate: string;
};

export const ACTION_LABEL: Record<ActionKind, string> = {
  review: "ממתין לבדיקת הצוות",
  overdue: "באיחור",
  clinic: "משימות לצוות ולרופא",
  upcoming: "מועד קרוב אצל המטופל",
};

export function actionItems(
  patientId: string,
  patientName: string,
  surgeryDate: string,
  tasks: Task[],
  today = getToday(),
): ActionItem[] {
  const horizon = addDays(today, 7);
  const out: ActionItem[] = [];
  if (surgeryDate < today) return out;
  for (const task of tasks) {
    if (!task.preop || task.state === "done" || task.state === "locked") continue;
    const base = { task, patientId, patientName, surgeryDate };
    if (task.state === "review") out.push({ ...base, kind: "review" });
    else if (task.overdue) out.push({ ...base, kind: "overdue" });
    else if (task.owner !== "patient" && task.dueDate <= horizon) out.push({ ...base, kind: "clinic" });
    else if (task.owner === "patient" && task.dueDate <= horizon) out.push({ ...base, kind: "upcoming" });
  }
  return out;
}
