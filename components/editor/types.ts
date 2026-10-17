import type { Owner, Status } from "@/lib/journey";

export type EditorTask = {
  id: string;
  title: string;
  description: string;
  owner: Owner;
  due_offset_days: number; // days before surgery; negative = after
  requires_evidence: boolean;
  requires_review: boolean;
  mandatory: boolean;
  depends_on: string[];
  kind: "task" | "appointment";
  location: string;
  scheduled_local: string; // journey mode only: "YYYY-MM-DDTHH:mm" in Israel time, or ""
  status?: Status; // journey mode only
};

export function newTask(): EditorTask {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    owner: "patient",
    due_offset_days: 7,
    requires_evidence: false,
    requires_review: false,
    mandatory: true,
    depends_on: [],
    kind: "task",
    location: "",
    scheduled_local: "",
  };
}

// Returns the title of a task that is part of a dependency cycle, if any.
export function findCycle(tasks: EditorTask[]): string | null {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const state = new Map<string, 1 | 2>();
  let bad: string | null = null;
  const visit = (id: string) => {
    if (bad) return;
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { bad = byId.get(id)?.title ?? id; return; }
    state.set(id, 1);
    for (const d of byId.get(id)?.depends_on ?? []) if (byId.has(d)) visit(d);
    state.set(id, 2);
  };
  tasks.forEach((t) => visit(t.id));
  return bad;
}
