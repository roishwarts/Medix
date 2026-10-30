"use client";

import { useId, useState, useTransition } from "react";
import { saveTemplatePatientInfo } from "./actions";

type Template = { id: string; name: string; patient_info: string | null };

export function GeneralInfoForm({ templates }: { templates: Template[] }) {
  const [selected, setSelected] = useState(templates[0]?.id ?? "");
  const [text, setText] = useState(templates[0]?.patient_info ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const selectId = useId();
  const textId = useId();

  function pick(id: string) {
    setSelected(id);
    setText(templates.find((t) => t.id === id)?.patient_info ?? "");
    setSaved(false);
    setError(null);
  }

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveTemplatePatientInfo(selected, text);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  if (templates.length === 0) {
    return (
      <div className="card p-4 sm:p-5">
        <h3 className="font-semibold">מידע כללי לניתוח</h3>
        <p className="mt-3 rounded-2xl bg-paper px-3 py-3 text-sm text-muted">
          עדיין אין תבניות. צרו תבנית תחת &quot;תבניות&quot; ואז חזרו לכאן.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="font-semibold">מידע כללי לניתוח</h3>
      <p className="mt-1 text-sm text-muted">
        טקסט חופשי שמופיע בעמוד המסלול של כל מטופל שמתחיל מהתבנית הזו. למשל: הנחיות כלליות, מה לצפות ביום הניתוח, פרטי קשר למקרה חירום.
      </p>
      <div className="mt-4">
        <label htmlFor={selectId} className="lbl">תבנית</label>
        <select id={selectId} className="field" value={selected} onChange={(e) => pick(e.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="mt-4">
        <label htmlFor={textId} className="lbl">מידע למטופל</label>
        <textarea
          id={textId}
          rows={6}
          className="field"
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false); }}
          placeholder="לדוגמה: יש להגיע צום, ללא תכשיטים, ללווה בגיר..."
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={pending}>
          {pending ? "שומר…" : "שמירה"}
        </button>
        {saved && <span role="status" className="text-sm text-ok">נשמר</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
