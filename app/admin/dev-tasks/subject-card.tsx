"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui";
import { addTask, deleteSubject, deleteTask, setTaskStatus, updateTask, type DevStatus } from "./actions";

export type DevTask = { id: string; title: string; notes: string | null; status: DevStatus };

const NEXT: Record<DevStatus, DevStatus> = { todo: "doing", doing: "done", done: "todo" };
const LABEL: Record<DevStatus, string> = { todo: "לביצוע", doing: "בתהליך", done: "הושלם" };

function StatusDot({ status }: { status: DevStatus }) {
  if (status === "done") return <span className="grid size-6 place-items-center rounded-full bg-ok text-white"><Icon name="check" size={13} /></span>;
  if (status === "doing") return <span className="grid size-6 place-items-center rounded-full border-2 border-accent"><span className="size-2.5 rounded-full bg-accent" /></span>;
  return <span className="block size-6 rounded-full border-2 border-line-strong" />;
}

function TaskRow({ task }: { task: DevTask }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else after?.();
    });
  };

  if (editing) {
    return (
      <li className="space-y-2 px-4 py-3">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} aria-label="שם המשימה" autoFocus />
        <textarea className="field" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="הערות (אופציונלי)" aria-label="הערות" />
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => updateTask(task.id, title, notes), () => setEditing(false))}>שמירה</button>
          <button className="btn btn-quiet btn-sm" onClick={() => { setEditing(false); setTitle(task.title); setNotes(task.notes ?? ""); }}>ביטול</button>
        </div>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </li>
    );
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <button
          className="mt-0.5 shrink-0 rounded-full disabled:opacity-60" disabled={pending}
          aria-label={`${LABEL[task.status]}, לחיצה תעביר ל${LABEL[NEXT[task.status]]}`}
          title={`${LABEL[task.status]} ← ${LABEL[NEXT[task.status]]}`}
          onClick={() => run(() => setTaskStatus(task.id, NEXT[task.status]))}
        >
          <StatusDot status={task.status} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`leading-snug ${task.status === "done" ? "text-muted line-through" : "font-medium"}`}>{task.title}</p>
          {task.notes && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">{task.notes}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button className="btn btn-quiet btn-sm" onClick={() => setEditing(true)}>עריכה</button>
          <button
            className="btn btn-quiet btn-sm px-2" aria-label="מחיקת משימה" disabled={pending}
            onClick={() => { if (confirm("למחוק את המשימה?")) run(() => deleteTask(task.id)); }}
          >
            <Icon name="trash" />
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-bad">{error}</p>}
    </li>
  );
}

export function SubjectCard({ id, title, tasks, doneCount, total }: { id: string; title: string; tasks: DevTask[]; doneCount: number; total: number }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await addTask(id, text);
      if (res.error) setError(res.error);
      else setText("");
    });
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="display text-lg">{title}</h2>
          <p className="text-xs text-muted"><span className="num">{doneCount}</span> מתוך <span className="num">{total}</span> הושלמו</p>
        </div>
        <button
          className="btn btn-quiet btn-sm px-2" aria-label={`מחיקת הנושא ${title}`} disabled={pending}
          onClick={() => { if (confirm(`למחוק את הנושא "${title}" וכל המשימות שבו?`)) start(async () => { await deleteSubject(id); }); }}
        >
          <Icon name="trash" />
        </button>
      </header>
      <ul className="divide-y divide-line">
        {tasks.map((t) => <TaskRow key={t.id} task={t} />)}
        {tasks.length === 0 && <li className="px-4 py-4 text-sm text-muted">אין משימות בנושא הזה.</li>}
      </ul>
      <form onSubmit={add} className="flex gap-2 border-t border-line bg-paper/60 p-3">
        <input className="field" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="משימה חדשה…" aria-label={`משימה חדשה ב${title}`} />
        <button className="btn btn-sm shrink-0 self-center" disabled={pending || !text.trim()}>הוספה</button>
      </form>
      {error && <p role="alert" className="px-4 pb-3 text-sm text-bad">{error}</p>}
    </section>
  );
}
