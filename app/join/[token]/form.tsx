"use client";

import { useActionState } from "react";
import { joinAsPatient } from "./actions";

export function JoinForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(joinAsPatient.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="username" className="lbl">שם משתמש לבחירתך</label>
        <input id="username" name="username" className="field" dir="ltr" autoCapitalize="none" autoComplete="username" required />
        <p className="mt-1 text-xs text-muted">אותיות באנגלית ומספרים</p>
      </div>
      <div>
        <label htmlFor="password" className="lbl">סיסמה (8 תווים לפחות)</label>
        <input id="password" name="password" type="password" className="field" dir="ltr" minLength={8} autoComplete="new-password" required />
      </div>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "יוצר…" : "יצירת משתמש"}</button>
    </form>
  );
}
