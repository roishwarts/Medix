"use client";

import { useActionState, useState } from "react";
import { setNewPassword } from "./actions";

import { useT } from "@/components/i18n-provider";

export function ResetForm({ token }: { token: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(setNewPassword.bind(null, token), undefined);
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? state?.error;

  return (
    <form
      action={action}
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        const value = new FormData(e.currentTarget).get("password");
        if (String(value ?? "").length < 8) {
          e.preventDefault();
          setLocalError(t("הסיסמה צריכה להכיל לפחות 8 תווים"));
          e.currentTarget.querySelector<HTMLInputElement>("#password")?.focus();
        } else setLocalError(null);
      }}
    >
      <div>
        <label htmlFor="password" className="lbl">{t("סיסמה חדשה")}</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            className="field pr-20"
            dir="ltr"
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "password-hint password-error" : "password-hint"}
            onChange={() => localError && setLocalError(null)}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 flex min-w-16 items-center justify-center rounded-r-xl px-3 text-sm font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          >
            {show ? t("הסתרה") : t("הצגה")}
          </button>
        </div>
        <p id="password-hint" className="mt-1.5 text-sm text-muted">{t("לפחות 8 תווים. עדיף שילוב של אותיות ומספרים.")}</p>
      </div>
      {error && <p id="password-error" role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
      <button className="btn btn-primary w-full" disabled={pending} aria-busy={pending}>{pending ? t("שומר…") : t("שמירת סיסמה והתחברות")}</button>
    </form>
  );
}
