"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { joinAsPatient } from "./actions";

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

export function JoinForm({ token }: { token: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(joinAsPatient.bind(null, token), undefined);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [local, setLocal] = useState<{ field: "username" | "password"; msg: string } | null>(null);
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const normalized = username.trim().toLowerCase();
  const userOk = USERNAME_RE.test(normalized);
  const passOk = password.length >= 8;

  // Server errors: attribute to the right field so the message sits next to it.
  const serverError = state?.error;
  const serverField: "username" | "password" | null = state?.field ?? null;
  const [seenError, setSeenError] = useState<typeof state>(undefined);
  const showServer = !!serverError && state !== seenError;

  useEffect(() => {
    if (!serverError) return;
    if (serverField === "password") passRef.current?.focus();
    else if (serverField === "username") userRef.current?.focus();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const error = local ?? (showServer && serverError ? { field: serverField, msg: serverError } : null);
  const userErr = error?.field === "username" ? error.msg : null;
  const passErr = error?.field === "password" ? error.msg : null;
  const generalErr = error && error.field === null ? error.msg : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!userOk) {
      e.preventDefault();
      setLocal({ field: "username", msg: t("שם משתמש: 3–30 תווים באנגלית, מספרים או . _ -") });
      userRef.current?.focus();
    } else if (!passOk) {
      e.preventDefault();
      setLocal({ field: "password", msg: t("הסיסמה צריכה להכיל לפחות 8 תווים") });
      passRef.current?.focus();
    } else {
      setLocal(null);
    }
  }

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="username" className="lbl text-base">{t("שם משתמש לבחירתך")}</label>
        <input
          id="username" name="username" ref={userRef} className="field !min-h-12 text-base" dir="ltr" autoFocus
          value={username} onChange={(e) => { setUsername(e.target.value); setLocal(null); setSeenError(state); }}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" enterKeyHint="next"
          aria-invalid={!!userErr} aria-describedby={userErr ? "username-hint username-err" : "username-hint"} required
        />
        <p id="username-hint" className="mt-1.5 text-sm text-muted">{t("אותיות באנגלית ומספרים, לפחות 3 תווים. תשתמש/י בו בכל כניסה.")}</p>
        {userErr && <p id="username-err" role="alert" className="mt-1.5 text-sm font-medium text-bad">{userErr}</p>}
      </div>

      <div>
        <label htmlFor="password" className="lbl text-base">{t("סיסמה")}</label>
        <div className="flex gap-2">
          <input
            id="password" name="password" ref={passRef} type={show ? "text" : "password"} className="field !min-h-12 text-base" dir="ltr"
            value={password} onChange={(e) => { setPassword(e.target.value); setLocal(null); setSeenError(state); }}
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="new-password" enterKeyHint="go"
            aria-invalid={!!passErr} aria-describedby={passErr ? "password-rule password-err" : "password-rule"} required
          />
          <button
            type="button" className="btn shrink-0 !min-h-12 min-w-[4.5rem]" onClick={() => setShow((s) => !s)}
            aria-controls="password"
          >{show ? t("הסתרה") : t("הצגה")}</button>
        </div>
        <p id="password-rule" className={`mt-1.5 flex items-center gap-1.5 text-sm ${passOk ? "text-ok" : "text-muted"}`}>
          <span aria-hidden="true" className="inline-block w-4 text-center font-semibold">{passOk ? "✓" : "•"}</span>
          <span>{t("לפחות 8 תווים")}{passOk ? ` – ${t("מצוין")}` : ""}</span>
        </p>
        {passErr && <p id="password-err" role="alert" className="mt-1.5 text-sm font-medium text-bad">{passErr}</p>}
      </div>

      {generalErr && (
        <p role="alert" className="rounded-2xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{generalErr}</p>
      )}

      <button className="btn btn-primary w-full !min-h-12 text-base" disabled={pending} aria-busy={pending}>
        {pending ? t("יוצר את החשבון…") : t("יצירת משתמש")}
      </button>
    </form>
  );
}
