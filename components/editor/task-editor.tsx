"use client";

import { useId, useState } from "react";
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
  const uid = useId();

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
      {tasks.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">עדיין אין משימות. הוסיפו את הראשונה.</p>
      )}
      <ol className="space-y-2">
        {tasks.map((t, i) => {
          const isOpen = open === t.id;
          const others = tasks.filter((o) => o.id !== t.id);
          const after = t.due_offset_days < 0;
          return (
            <li key={t.id} className="card">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex">
                  <button type="button" aria-label="הזזה למעלה" className="grid size-11 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink disabled:opacity-30 sm:size-9" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size={16} /></button>
                  <button type="button" aria-label="הזזה למטה" className="grid size-11 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink disabled:opacity-30 sm:size-9" disabled={i === tasks.length - 1} onClick={() => move(i, 1)}><Icon name="down" size={16} /></button>
                </div>
                <button type="button" className="min-w-0 flex-1 py-1 text-start" onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen} aria-controls={`${uid}-${t.id}-panel`}>
                  <span className="block truncate font-medium">{t.title || "משימה חדשה"}</span>
                  <span className="block truncate text-xs text-muted">
                    {t.kind === "appointment" ? "תור · " : ""}{t.owner === "patient" ? "מטופל" : t.owner === "staff" ? "צוות" : "רופא"} ·{" "}
                    {after ? `${-t.due_offset_days} ימים אחרי הניתוח` : t.due_offset_days === 0 ? "ביום הניתוח" : `${t.due_offset_days} ימים לפני`}
                    {t.depends_on.length > 0 && ` · תלוי ב-${t.depends_on.length}`}
                    {!t.mandatory && " · רשות"}
                    {journeyMode && t.status && ` · ${STATUS_TEXT[t.status]}`}
                  </span>
                </button>
                <button type="button" aria-label={`מחיקת המשימה ${t.title || "ללא כותרת"}`} className="grid size-11 place-items-center rounded-full text-muted hover:bg-bad-soft hover:text-bad sm:size-9" onClick={() => {
                  if (journeyMode && t.status && t.status !== "pending" && !confirm("למשימה הזו יש התקדמות. למחוק בכל זאת?")) return;
                  remove(t.id);
                }}><Icon name="trash" /></button>
              </div>

              {isOpen && (
                <div id={`${uid}-${t.id}-panel`} className="space-y-4 border-t border-line px-4 py-4">
                  <div>
                    <label className="lbl" htmlFor={`${uid}-${t.id}-title`}>כותרת</label>
                    <input id={`${uid}-${t.id}-title`} autoComplete="off" className="field" value={t.title} onChange={(e) => update(t.id, { title: e.target.value })} />
                  </div>
                  <div>
                    <label className="lbl" htmlFor={`${uid}-${t.id}-desc`}>הסבר למטופל</label>
                    <textarea id={`${uid}-${t.id}-desc`} className="field" value={t.description} onChange={(e) => update(t.id, { description: e.target.value })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="lbl" htmlFor={`${uid}-${t.id}-kind`}>סוג</label>
                      <select id={`${uid}-${t.id}-kind`} className="field" value={t.kind} onChange={(e) => update(t.id, { kind: e.target.value as EditorTask["kind"] })}>
                        <option value="task">משימה</option>
                        <option value="appointment">תור במרפאה</option>
                      </select>
                    </div>
                    <div>
                      <label className="lbl" htmlFor={`${uid}-${t.id}-owner`}>באחריות</label>
                      <select id={`${uid}-${t.id}-owner`} className="field" value={t.owner} onChange={(e) => update(t.id, { owner: e.target.value as EditorTask["owner"] })}>
                        <option value="patient">מטופל</option>
                        <option value="staff">צוות</option>
                        <option value="doctor">רופא</option>
                      </select>
                    </div>
                    <div>
                      <label className="lbl" htmlFor={`${uid}-${t.id}-days`}>ימים</label>
                      <input id={`${uid}-${t.id}-days`} type="number" inputMode="numeric" min={0} className="field num" value={Math.abs(t.due_offset_days)}
                        onChange={(e) => {
                          const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          update(t.id, { due_offset_days: after ? -n : n });
                        }} />
                    </div>
                    <div>
                      <label className="lbl" htmlFor={`${uid}-${t.id}-dir`}>ביחס לניתוח</label>
                      <select id={`${uid}-${t.id}-dir`} className="field" value={after ? "after" : "before"}
                        onChange={(e) => update(t.id, { due_offset_days: e.target.value === "after" ? -Math.abs(t.due_offset_days) : Math.abs(t.due_offset_days) })}>
                        <option value="before">לפני</option>
                        <option value="after">אחרי</option>
                      </select>
                    </div>
                  </div>
                  {t.kind === "appointment" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="lbl" htmlFor={`${uid}-${t.id}-loc`}>מיקום</label>
                        <input id={`${uid}-${t.id}-loc`} autoComplete="off" className="field" value={t.location} onChange={(e) => update(t.id, { location: e.target.value })} placeholder="למשל: המרפאה, קומה 2" />
                      </div>
                      {journeyMode && (
                        <div>
                          <label className="lbl" htmlFor={`${uid}-${t.id}-when`}>מועד התור (תאריך ושעה)</label>
                          <input id={`${uid}-${t.id}-when`} type="datetime-local" className="field num" dir="ltr" value={t.scheduled_local} onChange={(e) => update(t.id, { scheduled_local: e.target.value })} />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <label className="flex min-h-11 items-center gap-2.5"><input type="checkbox" className="size-5 accent-accent" checked={t.mandatory} onChange={(e) => update(t.id, { mandatory: e.target.checked })} /> חובה (נספר במוכנות)</label>
                    <label className="flex min-h-11 items-center gap-2.5"><input type="checkbox" className="size-5 accent-accent" checked={t.requires_evidence} onChange={(e) => update(t.id, { requires_evidence: e.target.checked, requires_review: e.target.checked || t.requires_review })} /> דורש העלאת מסמך</label>
                    <label className="flex min-h-11 items-center gap-2.5"><input type="checkbox" className="size-5 accent-accent" checked={t.requires_review || t.requires_evidence} disabled={t.requires_evidence} onChange={(e) => update(t.id, { requires_review: e.target.checked })} /> דורש אישור צוות</label>
                  </div>
                  <fieldset>
                    <legend className="lbl">המשימה נפתחת רק אחרי שהמשימות האלה אושרו</legend>
                    {others.length === 0 ? (
                      <p className="text-sm text-muted">אין משימות אחרות.</p>
                    ) : (
                      <div className="grid max-h-56 gap-0.5 overflow-y-auto rounded-xl border border-line p-1.5 sm:grid-cols-2">
                        {others.map((o) => (
                          <label key={o.id} className="flex min-h-11 items-center gap-2.5 rounded-lg px-1.5 text-sm hover:bg-paper">
                            <input type="checkbox" className="size-5 shrink-0 accent-accent" checked={t.depends_on.includes(o.id)}
                              onChange={(e) => update(t.id, { depends_on: e.target.checked ? [...t.depends_on, o.id] : t.depends_on.filter((d) => d !== o.id) })} />
                            <span className="truncate">{o.title || "ללא כותרת"}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
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
