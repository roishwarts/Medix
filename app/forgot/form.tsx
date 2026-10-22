"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  if (state?.sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-ok">הבקשה נשלחה למרפאה. הצוות ישלח אליך קישור לאיפוס הסיסמה.</p>
        <Link href="/login" className="btn w-full">חזרה לכניסה</Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="username" className="lbl">שם משתמש</label>
        <input id="username" name="username" className="field" dir="ltr" autoCapitalize="none" autoComplete="username" required />
      </div>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "שולח…" : "בקשת איפוס סיסמה"}</button>
      <Link href="/login" className="btn btn-quiet w-full">חזרה לכניסה</Link>
    </form>
  );
}
