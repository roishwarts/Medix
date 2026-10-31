"use client";

import { useActionState, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { acceptInvite } from "./actions";

export function AcceptForm({ token, defaultName }: { token: string; defaultName: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(acceptInvite.bind(null, token), undefined);
  // Controlled so a failed attempt does not wipe what the person typed.
  const [name, setName] = useState(defaultName);
  const [username, setUsername] = useState("");
  const [showPw, setShowPw] = useState(false);
  const errId = "invite-error";

  return (
    <form action={action} className="space-y-5" aria-busy={pending}>
      <div>
        <label htmlFor="full_name" className="lbl">{t("השם שלך")}</label>
        <input
          id="full_name" name="full_name" className="field" autoComplete="name" required maxLength={80} autoFocus
          value={name} onChange={(e) => setName(e.target.value)} aria-describedby={state?.error ? errId : undefined}
        />
      </div>
      <div>
        <label htmlFor="username" className="lbl">{t("שם משתמש לבחירתך")}</label>
        <input
          id="username" name="username" className="field" dir="ltr" required
          autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" inputMode="text"
          minLength={3} maxLength={30} pattern="[A-Za-z0-9._\-]{3,30}" title={t("3–30 תווים: אותיות באנגלית, מספרים, נקודה, קו תחתון או מקף")}
          value={username} onChange={(e) => setUsername(e.target.value)} aria-describedby="username-hint"
        />
        <p id="username-hint" className="mt-1.5 text-xs text-muted">{t("3–30 תווים: אותיות באנגלית ומספרים. בעזרתו תיכנס/י בהמשך.")}</p>
      </div>
      <div>
        <label htmlFor="password" className="lbl">{t("סיסמה")}</label>
        <div className="relative">
          <input
            id="password" name="password" type={showPw ? "text" : "password"} className="field pe-20" dir="ltr"
            minLength={8} autoComplete="new-password" required aria-describedby="password-hint"
          />
          <button
            type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}
            className="absolute end-1 top-1/2 flex h-11 min-w-16 -translate-y-1/2 items-center justify-center rounded-full px-3 text-sm text-accent hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            {showPw ? t("הסתרה") : t("הצגה")}
          </button>
        </div>
        <p id="password-hint" className="mt-1.5 text-xs text-muted">{t("לפחות 8 תווים.")}</p>
      </div>
      <div aria-live="polite">
        {state?.error && (
          <p id={errId} role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">{state.error}</p>
        )}
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? t("יוצר חשבון…") : t("יצירת חשבון והצטרפות")}</button>
    </form>
  );
}
