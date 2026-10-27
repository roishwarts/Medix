"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { requestPasswordReset } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  const [username, setUsername] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state?.sent) headingRef.current?.focus();
  }, [state?.sent]);

  if (state?.sent) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok" aria-hidden="true">
          <Icon name="check" size={24} />
        </span>
        <div role="status" className="space-y-2">
          <h1 ref={headingRef} tabIndex={-1} className="display text-2xl outline-none">הבקשה נשלחה למרפאה</h1>
          <p className="text-muted">
            אם שם המשתמש קיים, הצוות ישלח אליך קישור לבחירת סיסמה חדשה. זה עשוי לקחת זמן, ואין צורך לשלוח שוב.
          </p>
        </div>
        <Link href="/login" className="btn btn-primary w-full">חזרה לכניסה</Link>
      </div>
    );
  }

  const errorId = "username-error";
  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-2">
        <h1 className="display text-2xl">שכחתי סיסמה</h1>
        <p className="text-muted">הזן/י את שם המשתמש ונעביר את הבקשה למרפאה. הצוות ישלח לך קישור לבחירת סיסמה חדשה.</p>
      </div>
      <div>
        <label htmlFor="username" className="lbl">שם משתמש</label>
        <input
          id="username"
          name="username"
          className="field"
          dir="ltr"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="username"
          enterKeyHint="send"
          autoFocus
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? errorId : undefined}
        />
        {state?.error && <p id={errorId} role="alert" className="mt-2 text-sm text-bad">{state.error}</p>}
      </div>
      <div className="space-y-2">
        <button className="btn btn-primary w-full" disabled={pending} aria-busy={pending}>
          {pending ? "שולח…" : "בקשת איפוס סיסמה"}
        </button>
        <Link href="/login" className="btn btn-quiet w-full">חזרה לכניסה</Link>
      </div>
    </form>
  );
}
