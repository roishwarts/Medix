"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import { newTask, type EditorTask } from "./types";

const STATUS_TEXT = { pending: "פתוח", submitted: "ממתין לבדיקה", accepted: "הושלם", rejected: "הוחזר" } as const;

export function TaskEditor({
  tasks,
  onChange,
  journeyMode,
}: {
  tasks: EditorTask[];
  onChange: (t: EditorTask[]) => void;
  journeyMode?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<EditorTask>) =>
    onChange(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const remove = (id: string) =>
    onChange(tasks.filter((t) => t.id !== id).map((t) => ({ ...t, depends_on: t.depends_on.filter((d) => d !== id) })));

  const move = (i: number, dir: -1 | 1) => {
    const next = [...tasks];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const add = () => {
    const t = newTask();
    onChange([...tasks, t]);
    setOpen(t.id);
  };

  const sortByDate = () =>
    onChange([...tasks].sort((a, b) => b.due_offset_days - a.due_offset_days));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="eyebrow">משימות ({tasks.length})</h2>
        <button type="button" className="btn btn-quiet btn-sm" onClick={sortByDate}>מיון לפי תאריך</button>
      </div>
      <ol className="space-y-2">
        {tasks.map((t, i) => {
          const isOpen = open === t.id;
          const others = tasks.filter((o) => o.id !== t.id);
          const after = t.due_offset_days < 0;
          return (
            <li key={t.id} className="card">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex flex-col">
                  <button type="button" aria-label="הזזה למעלה" className="text-muted hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size={14} /></button>
                  <button type="button" aria-label="הזזה למטה" className="text-muted hover:text-ink disabled:opacity-30" disabled={i === tasks.length - 1} onClick={() => move(i, 1)}><Icon name="down" size={14} /></button>
                </div>
                <button type="button" className="min-w-0 flex-1 py-1 text-start" onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen}>
                  <span className="block truncate font-medium">{t.title || "משימה חדשה"}</span>
                  <span className="block truncate text-xs text-muted">
                    {t.owner === "patient" ? "מטופל" : t.owner === "staff" ? "צוות" : "רופא"} ·{" "}
                    {after ? `${-t.due_offset_days} ימים אחרי הניתוח` : t.due_offset_days === 0 ? "ביום הניתוח" : `${t.due_offset_days} ימים לפני`}
                    {t.depends_on.length > 0 && ` · תלוי ב-${t.depends_on.length}`}
                    {!t.mandatory && " · רשות"}
                    {journeyMode && t.status && ` · ${STATUS_TEXT[t.status]}`}
                  </span>
                </button>
                <button type="button" aria-label="מחיקה" className="p-2 text-muted hover:text-bad" onClick={() => {
                  if (journeyMode && t.status && t.status !== "pending" && !confirm("למשימה הזו יש התקדמות. למחוק בכל זאת?")) return;
                  remove(t.id);
                }}><Icon name="trash" /></button>
              </div>

              {isOpen && (
                <div className="space-y-4 border-t border-line px-4 py-4">
                  <div>
                    <label className="lbl">כותרת</label>
                    <input className="field" value={t.title} onChange={(e) => update(t.id, { title: e.target.value })} />
                  </div>
                  <div>
                    <label className="lbl">הסבר למטופל</label>
                    <textarea className="field" value={t.description} onChange={(e) => update(t.id, { description: e.target.value })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="lbl">באחריות</label>
                      <select className="field" value={t.owner} onChange={(e) => update(t.id, { owner: e.target.value as EditorTask["owner"] })}>
                        <option value="patient">מטופל</option>
                        <option value="staff">צוות</option>
                        <option value="doctor">רופא</option>
                      </select>
                    </div>
                    <div>
                      <label className="lbl">ימים</label>
                      <input type="number" min={0} className="field num" value={Math.abs(t.due_offset_days)}
                        onChange={(e) => {
                          const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          update(t.id, { due_offset_days: after ? -n : n });
                        }} />
                    </div>
                    <div>
                      <label className="lbl">ביחס לניתוח</label>
                      <select className="field" value={after ? "after" : "before"}
                        onChange={(e) => update(t.id, { due_offset_days: e.target.value === "after" ? -Math.abs(t.due_offset_days) : Math.abs(t.due_offset_days) })}>
                        <option value="before">לפני</option>
                        <option value="after">אחרי</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={t.mandatory} onChange={(e) => update(t.id, { mandatory: e.target.checked })} /> חובה (נספר במוכנות)</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={t.requires_evidence} onChange={(e) => update(t.id, { requires_evidence: e.target.checked, requires_review: e.target.checked || t.requires_review })} /> דורש העלאת מסמך</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={t.requires_review || t.requires_evidence} disabled={t.requires_evidence} onChange={(e) => update(t.id, { requires_review: e.target.checked })} /> דורש אישור צוות</label>
                  </div>
                  <div>
                    <p className="lbl">המשימה נפתחת רק אחרי שהאלה אושרו</p>
                    {others.length === 0 ? (
                      <p className="text-sm text-muted">אין משימות אחרות.</p>
                    ) : (
                      <div className="grid max-h-48 gap-1 overflow-y-auto rounded border border-line p-2 sm:grid-cols-2">
                        {others.map((o) => (
                          <label key={o.id} className="flex items-center gap-2 py-0.5 text-sm">
                            <input type="checkbox" className="size-4 accent-ink" checked={t.depends_on.includes(o.id)}
                              onChange={(e) => update(t.id, { depends_on: e.target.checked ? [...t.depends_on, o.id] : t.depends_on.filter((d) => d !== o.id) })} />
                            <span className="truncate">{o.title || "ללא כותרת"}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn mt-3 w-full" onClick={add}><Icon name="plus" /> הוספת משימה</button>
    </div>
  );
}
