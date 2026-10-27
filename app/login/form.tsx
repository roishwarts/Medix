"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/ui";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);
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
        <div className="relative">
          <input id="password" name="password" type={show ? "text" : "password"} className="field pe-16" dir="ltr"
            autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go"
            aria-invalid={err ? true : undefined} aria-describedby={err ? "login-error" : undefined} required />
          <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}
            className="absolute inset-y-0 end-0 min-w-14 rounded-e-2xl px-3 text-sm font-medium text-muted hover:text-ink">
            {show ? "הסתר" : "הצג"}
          </button>
        </div>
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
