"use client";

import { useActionState } from "react";
import { createPatient } from "../actions";

export function NewPatientForm({ templates }: { templates: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createPatient, undefined);
  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="full_name" className="lbl">שם מלא</label>
        <input id="full_name" name="full_name" className="field" required />
      </div>
      <div>
        <label htmlFor="phone" className="lbl">טלפון</label>
        <input id="phone" name="phone" className="field" dir="ltr" inputMode="tel" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="template_id" className="lbl">תבנית</label>
          <select id="template_id" name="template_id" className="field" required>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="surgery_date" className="lbl">תאריך ניתוח</label>
          <input id="surgery_date" name="surgery_date" type="date" className="field" required />
        </div>
      </div>
      <fieldset className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
        <legend className="eyebrow mb-3">התחברות</legend>
        <div>
          <label htmlFor="username" className="lbl">שם משתמש</label>
          <input id="username" name="username" className="field" dir="ltr" autoCapitalize="none" required />
        </div>
        <div>
          <label htmlFor="password" className="lbl">סיסמה זמנית</label>
          <input id="password" name="password" className="field" dir="ltr" minLength={8} required />
        </div>
      </fieldset>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "יוצר…" : "יצירת מטופל ופתיחת מסלול"}</button>
    </form>
  );
}
