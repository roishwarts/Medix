"use client";

import { useActionState } from "react";
import { setNewPassword } from "./actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setNewPassword.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="password" className="lbl">סיסמה חדשה (8 תווים לפחות)</label>
        <input id="password" name="password" type="password" className="field" dir="ltr" minLength={8} autoComplete="new-password" required />
      </div>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "שומר…" : "שמירת סיסמה והתחברות"}</button>
    </form>
  );
}
