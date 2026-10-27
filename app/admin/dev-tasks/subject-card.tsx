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
  const [confirming, setConfirming] = useState(false);
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
          <button className="btn btn-primary btn-sm min-h-11 sm:min-h-9" disabled={pending || !title.trim()} onClick={() => run(() => updateTask(task.id, title, notes), () => setEditing(false))}>{pending ? "שומר…" : "שמירה"}</button>
          <button className="btn btn-quiet btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={() => { setEditing(false); setTitle(task.title); setNotes(task.notes ?? ""); setError(null); }}>ביטול</button>
        </div>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </li>
    );
  }

  return (
    <li className="px-4 py-2">
      <div className="flex flex-wrap items-start gap-x-1 gap-y-0">
        <button
          className="-my-1 -ms-2 grid size-11 shrink-0 place-items-center rounded-full disabled:opacity-60" disabled={pending}
          aria-label={`${LABEL[task.status]}, לחיצה תעביר ל${LABEL[NEXT[task.status]]}`}
          title={`${LABEL[task.status]} ← ${LABEL[NEXT[task.status]]}`}
          onClick={() => run(() => setTaskStatus(task.id, NEXT[task.status]))}
        >
          <StatusDot status={task.status} />
        </button>
        <div className="min-w-0 flex-1 basis-0 pt-0.5 [min-width:10rem]">
          <p className={`break-words leading-snug ${task.status === "done" ? "text-muted line-through" : "font-medium"}`}>{task.title}</p>
          {task.notes && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted">{task.notes}</p>}
        </div>
        <div className="flex shrink-0 basis-full gap-1 ps-11 sm:basis-auto sm:ps-0">
          <button className="btn btn-quiet btn-sm min-h-11 sm:min-h-9" onClick={() => setEditing(true)}>עריכה</button>
          {confirming ? (
            <>
              <button className="btn btn-danger btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={() => run(() => deleteTask(task.id), () => setConfirming(false))}>{pending ? "מוחק…" : "מחיקה"}</button>
              <button className="btn btn-quiet btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={() => setConfirming(false)}>ביטול</button>
            </>
          ) : (
            <button
              className="btn btn-quiet btn-sm size-11 px-0 sm:size-9" aria-label={`מחיקת המשימה: ${task.title}`} disabled={pending}
              onClick={() => setConfirming(true)}
            >
              <Icon name="trash" />
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-bad">{error}</p>}
    </li>
  );
}

export function SubjectCard({ id, title, tasks, doneCount, total }: { id: string; title: string; tasks: DevTask[]; doneCount: number; total: number }) {
  const [text, setText] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
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
          <h2 className="display break-words text-lg">{title}</h2>
          <p className="text-xs text-muted"><span className="num">{doneCount}</span> מתוך <span className="num">{total}</span> הושלמו</p>
        </div>
        {!confirmDel && (
          <button
            className="btn btn-quiet btn-sm size-11 shrink-0 px-0 sm:size-9" aria-label={`מחיקת הנושא ${title}`} disabled={pending}
            onClick={() => setConfirmDel(true)}
          >
            <Icon name="trash" />
          </button>
        )}
      </header>
      {confirmDel && (
        <div role="alertdialog" aria-label={`אישור מחיקת הנושא ${title}`} className="flex flex-wrap items-center gap-2 border-b border-line bg-bad-soft px-4 py-3">
          <p className="min-w-0 flex-1 basis-56 break-words text-sm font-medium text-bad">למחוק את הנושא וכל המשימות שבו? אי אפשר לבטל.</p>
          <div className="flex gap-2">
            <button className="btn btn-danger btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={() => start(async () => { await deleteSubject(id); setConfirmDel(false); })}>{pending ? "מוחק…" : "מחיקה"}</button>
            <button className="btn btn-quiet btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={() => setConfirmDel(false)}>ביטול</button>
          </div>
        </div>
      )}
      <ul className="divide-y divide-line">
        {tasks.map((t) => <TaskRow key={t.id} task={t} />)}
        {tasks.length === 0 && <li className="px-4 py-4 text-sm text-muted">אין משימות בנושא הזה.</li>}
      </ul>
      <form onSubmit={add} className="flex gap-2 border-t border-line bg-paper/60 p-3">
        <input className="field" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="משימה חדשה…" aria-label={`משימה חדשה ב${title}`} />
        <button className="btn btn-sm min-h-11 shrink-0 self-center sm:min-h-9" disabled={pending || !text.trim()}>{pending ? "מוסיף…" : "הוספה"}</button>
      </form>
      {error && <p role="alert" className="px-4 pb-3 text-sm text-bad">{error}</p>}
    </section>
  );
}
