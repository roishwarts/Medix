"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/ui";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const [user, setUser] = useState("");
  const err = state?.error;
  return (
    <form action={action} className="space-y-4" aria-busy={pending}>
      <div>
        <label htmlFor="username" className="lbl">שם משתמש</label>
        <input id="username" name="username" value={user} onChange={(e) => setUser(e.target.value)} className="field" dir="ltr" autoComplete="username"
          autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="text" enterKeyHint="next"
          aria-invalid={err ? true : undefined} aria-describedby={err ? "login-error" : undefined} required />
      </div>
      <div>
        <label htmlFor="password" className="lbl">סיסמה</label>
        <input id="password" name="password" type="password" className="field" dir="ltr"
          autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go"
          aria-invalid={err ? true : undefined} aria-describedby={err ? "login-error" : undefined} required />
      </div>
      <div aria-live="polite" className={err ? "" : "hidden"}>
        {err && (
          <p id="login-error" role="alert" className="flex items-start gap-2 rounded-xl bg-bad-soft px-4 py-3 text-sm leading-relaxed text-bad">
            <span className="mt-0.5 shrink-0"><Icon name="alert" /></span>
            <span>{err}</span>
          </p>
        )}
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "נכנס…" : "כניסה"}
      </button>
    </form>
  );
}
