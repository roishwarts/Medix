"use client";

import { useT } from "@/components/i18n-provider";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { newTask, type EditorTask } from "./types";

const STATUS_TEXT = { pending: "פתוח", submitted: "ממתין לבדיקה", accepted: "הושלם", rejected: "הוחזר" } as const;

export function TaskEditor({
  tasks,
  onChange,
  journeyMode,
  focusTask,
}: {
  tasks: EditorTask[];
  onChange: (tk: EditorTask[]) => void;
  journeyMode?: boolean;
  // Set (to a new object each time, even for the same id) to open a task, scroll to it and flash it —
  // used to point at the task a save failed on, e.g. a missing title or a dependency cycle.
  focusTask?: { id: string; nonce: number } | null;
}) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const uid = useId();
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!focusTask) return;
    const el = itemRefs.current.get(focusTask.id);
    setOpen(focusTask.id);
    setFlash(focusTask.id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const tk = setTimeout(() => setFlash(null), 2000);
    return () => clearTimeout(tk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTask?.id, focusTask?.nonce]);

  const update = (id: string, patch: Partial<EditorTask>) =>
    onChange(tasks.map((tk) => (tk.id === id ? { ...tk, ...patch } : tk)));

  const remove = (id: string) =>
    onChange(tasks.filter((tk) => tk.id !== id).map((tk) => ({ ...tk, depends_on: tk.depends_on.filter((d) => d !== id) })));

  const move = (i: number, dir: -1 | 1) => {
    const next = [...tasks];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const add = () => {
    const tk = newTask();
    onChange([...tasks, tk]);
    setOpen(tk.id);
  };

  const sortByDate = () =>
    onChange([...tasks].sort((a, b) => b.due_offset_days - a.due_offset_days));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="eyebrow">{t("משימות ({n})", { n: tasks.length })}</h2>
        <button type="button" className="btn btn-quiet btn-sm" onClick={sortByDate}>{t("מיון לפי תאריך")}</button>
      </div>
      {tasks.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">{t("עדיין אין משימות. הוסיפו את הראשונה.")}</p>
      )}
      <ol className="space-y-2">
        {tasks.map((tk, i) => {
          const isOpen = open === tk.id;
          const others = [...tasks.filter((o) => o.id !== tk.id)].sort((a, b) => b.due_offset_days - a.due_offset_days);
          const after = tk.due_offset_days < 0;
          const isFlashing = flash === tk.id;
          return (
            <li
              key={tk.id}
              ref={(el) => { if (el) itemRefs.current.set(tk.id, el); else itemRefs.current.delete(tk.id); }}
              className={`card transition-shadow ${isFlashing ? "ring-2 ring-bad" : ""}`}
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex">
                  <button type="button" aria-label={t("הזזה למעלה")} className="grid size-11 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink disabled:opacity-30 sm:size-9" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size={16} /></button>
                  <button type="button" aria-label={t("הזזה למטה")} className="grid size-11 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink disabled:opacity-30 sm:size-9" disabled={i === tasks.length - 1} onClick={() => move(i, 1)}><Icon name="down" size={16} /></button>
                </div>
                <button type="button" className="min-w-0 flex-1 py-1 text-start" onClick={() => setOpen(isOpen ? null : tk.id)} aria-expanded={isOpen} aria-controls={`${uid}-${tk.id}-panel`}>
                  <span className="block truncate font-medium">{tk.title || t("משימה חדשה")}</span>
                  <span className="block truncate text-xs text-muted">
                    {tk.kind === "appointment" ? t("תור · ") : ""}{tk.owner === "patient" ? t("מטופל") : tk.owner === "staff" ? t("צוות") : t("רופא")} ·{" "}
                    {after ? t("{n} ימים אחרי הניתוח", { n: -tk.due_offset_days }) : tk.due_offset_days === 0 ? t("ביום הניתוח") : t("{n} ימים לפני", { n: tk.due_offset_days })}
                    {tk.depends_on.length > 0 && ` · ${t("תלוי ב־{n}", { n: tk.depends_on.length })}`}
                    {!tk.mandatory && ` · ${t("רשות")}`}
                    {journeyMode && tk.status && ` · ${t(STATUS_TEXT[tk.status])}`}
                  </span>
                </button>
                <button type="button" aria-label={t("מחיקת המשימה {title}", { title: tk.title || t("ללא כותרת") })} className="grid size-11 place-items-center rounded-full text-muted hover:bg-bad-soft hover:text-bad sm:size-9" onClick={() => {
                  if (journeyMode && tk.status && tk.status !== "pending" && !confirm(t("למשימה הזו יש התקדמות. למחוק בכל זאת?"))) return;
                  remove(tk.id);
                }}><Icon name="trash" /></button>
              </div>

              {isOpen && (
                <div id={`${uid}-${tk.id}-panel`} className="space-y-4 border-tk border-line px-4 py-4">
                  <div>
                    <label className="lbl" htmlFor={`${uid}-${tk.id}-title`}>{t("כותרת")}</label>
                    <input
                      id={`${uid}-${tk.id}-title`}
                      autoComplete="off"
                      required
                      aria-invalid={isFlashing && !tk.title.trim()}
                      className={`field ${isFlashing && !tk.title.trim() ? "border-bad" : ""}`}
                      value={tk.title}
                      onChange={(e) => update(tk.id, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="lbl" htmlFor={`${uid}-${tk.id}-desc`}>{t("הסבר למטופל")}</label>
                    <textarea id={`${uid}-${tk.id}-desc`} className="field" value={tk.description} onChange={(e) => update(tk.id, { description: e.target.value })} />
                  </div>
                  <div>
                    <p className="eyebrow mb-2">{t("תזמון ואחריות")}</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="lbl" htmlFor={`${uid}-${tk.id}-kind`}>{t("סוג")}</label>
                      <select id={`${uid}-${tk.id}-kind`} className="field" value={tk.kind} onChange={(e) => update(tk.id, { kind: e.target.value as EditorTask["kind"] })}>
                        <option value="task">{t("משימה")}</option>
                        <option value="appointment">{t("תור במרפאה")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="lbl" htmlFor={`${uid}-${tk.id}-owner`}>{t("באחריות")}</label>
                      <select id={`${uid}-${tk.id}-owner`} className="field" value={tk.owner} onChange={(e) => update(tk.id, { owner: e.target.value as EditorTask["owner"] })}>
                        <option value="patient">{t("מטופל")}</option>
                        <option value="staff">{t("צוות")}</option>
                        <option value="doctor">{t("רופא")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="lbl" htmlFor={`${uid}-${tk.id}-days`}>{t("ימים")}</label>
                      <input id={`${uid}-${tk.id}-days`} type="number" inputMode="numeric" min={0} className="field num" value={Math.abs(tk.due_offset_days)}
                        onChange={(e) => {
                          const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          update(tk.id, { due_offset_days: after ? -n : n });
                        }} />
                    </div>
                    <div>
                      <label className="lbl" htmlFor={`${uid}-${tk.id}-dir`}>{t("ביחס לניתוח")}</label>
                      <select id={`${uid}-${tk.id}-dir`} className="field" value={after ? "after" : "before"}
                        onChange={(e) => update(tk.id, { due_offset_days: e.target.value === "after" ? -Math.abs(tk.due_offset_days) : Math.abs(tk.due_offset_days) })}>
                        <option value="before">{t("לפני")}</option>
                        <option value="after">{t("אחרי")}</option>
                      </select>
                    </div>
                    </div>
                  </div>
                  {tk.kind === "appointment" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="lbl" htmlFor={`${uid}-${tk.id}-loc`}>{t("מיקום")}</label>
                        <input id={`${uid}-${tk.id}-loc`} autoComplete="off" className="field" value={tk.location} onChange={(e) => update(tk.id, { location: e.target.value })} placeholder={t("למשל: המרפאה, קומה 2")} />
                      </div>
                      {journeyMode && (
                        <div>
                          <label className="lbl" htmlFor={`${uid}-${tk.id}-when`}>{t("מועד התור (תאריך ושעה)")}</label>
                          <input id={`${uid}-${tk.id}-when`} type="datetime-local" className="field num" dir="ltr" value={tk.scheduled_local} onChange={(e) => update(tk.id, { scheduled_local: e.target.value })} />
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="eyebrow mb-2">{t("דרישות")}</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <label className="flex min-h-11 items-center gap-2.5"><input type="checkbox" className="size-5 accent-accent" checked={tk.mandatory} onChange={(e) => update(tk.id, { mandatory: e.target.checked })} /> {t("חובה (נספר במוכנות)")}</label>
                      <label className="flex min-h-11 items-center gap-2.5"><input type="checkbox" className="size-5 accent-accent" checked={tk.requires_evidence} onChange={(e) => update(tk.id, { requires_evidence: e.target.checked, requires_review: e.target.checked || tk.requires_review })} /> {t("דורש העלאת מסמך")}</label>
                      <label className="flex min-h-11 items-center gap-2.5"><input type="checkbox" className="size-5 accent-accent" checked={tk.requires_review || tk.requires_evidence} disabled={tk.requires_evidence} onChange={(e) => update(tk.id, { requires_review: e.target.checked })} /> {t("דורש אישור צוות")}</label>
                    </div>
                  </div>
                  <fieldset>
                    <legend className="eyebrow mb-2">
                      {t("המשימה נפתחת רק אחרי שהמשימות האלה אושרו")}
                      {tk.depends_on.length > 0 && ` · ${t("נבחרו {n}", { n: tk.depends_on.length })}`}
                    </legend>
                    {others.length === 0 ? (
                      <p className="text-sm text-muted">{t("אין משימות אחרות להוסיף כתלות.")}</p>
                    ) : (
                      <div className="grid max-h-56 gap-0.5 overflow-y-auto rounded-xl border border-line p-1.5 sm:grid-cols-2">
                        {others.map((o) => (
                          <label key={o.id} className="flex min-h-11 items-center gap-2.5 rounded-lg px-1.5 text-sm hover:bg-paper">
                            <input type="checkbox" className="size-5 shrink-0 accent-accent" checked={tk.depends_on.includes(o.id)}
                              onChange={(e) => update(tk.id, { depends_on: e.target.checked ? [...tk.depends_on, o.id] : tk.depends_on.filter((d) => d !== o.id) })} />
                            <span className="truncate">{o.title || t("ללא כותרת")}</span>
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
      <button type="button" className="btn mt-3 w-full" onClick={add}><Icon name="plus" /> {t("הוספת משימה")}</button>
    </div>
  );
}
