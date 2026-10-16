"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="username" className="lbl">שם משתמש</label>
        <input id="username" name="username" className="field" dir="ltr" autoComplete="username"
          autoCapitalize="none" autoCorrect="off" required />
      </div>
      <div>
        <label htmlFor="password" className="lbl">סיסמה</label>
        <input id="password" name="password" type="password" className="field" dir="ltr"
          autoComplete="current-password" required />
      </div>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "נכנס…" : "כניסה"}
      </button>
    </form>
  );
}
