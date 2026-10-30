"use client";

import { useT } from "@/components/i18n-provider";
import { useActionState, useState } from "react";
import { PasswordField } from "@/components/password-field";
import { createClinic } from "../../actions";

export function NewClinicForm({ bases }: { bases: { id: string; name: string }[] }) {
  const t = useT();
  const [state, action, pending] = useActionState(createClinic, undefined);
  // React 19 resets uncontrolled fields after an action; keep typed values in state instead.
  const [clinicName, setClinicName] = useState("");
  const [physician, setPhysician] = useState("");
  const [username, setUsername] = useState("");
  const [picked, setPicked] = useState<string[]>(() => (bases[0] ? [bases[0].id] : []));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <form action={action} className="card mt-6 space-y-6 p-5 sm:p-7" aria-busy={pending}>
      <div>
        <label htmlFor="clinic_name" className="lbl">{t("שם המרפאה")}</label>
        <input id="clinic_name" name="clinic_name" className="field" value={clinicName}
          onChange={(e) => setClinicName(e.target.value)} autoComplete="organization" required />
      </div>
      <fieldset className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
        <legend className="eyebrow pe-2">{t("הרופא")}</legend>
        <div className="sm:col-span-2">
          <label htmlFor="physician" className="lbl">{t("שם הרופא")}</label>
          <input id="physician" name="physician" className="field" placeholder={t("ד״ר ...")} value={physician}
            onChange={(e) => setPhysician(e.target.value)} autoComplete="off" required />
        </div>
        <div>
          <label htmlFor="username" className="lbl">{t("שם משתמש")}</label>
          <input id="username" name="username" className="field" dir="ltr" autoCapitalize="none" autoCorrect="off"
            spellCheck={false} autoComplete="off" aria-describedby="username-hint" value={username}
            onChange={(e) => setUsername(e.target.value)} required />
          <p id="username-hint" className="mt-1.5 text-xs text-muted">{t("באנגלית, 3 עד 30 תווים. מותרים גם מספרים ונקודה.")}</p>
        </div>
        <div>
          <PasswordField label={t("סיסמה זמנית")} />
          <p className="mt-1.5 text-xs text-muted">{t("לפחות 8 תווים. הרופא יקבל אותה מכם.")}</p>
        </div>
      </fieldset>
      <fieldset className="border-t border-line pt-5">
        <legend className="eyebrow mb-3 pe-2">{t("תבניות להתחלה")}</legend>
        {bases.length === 0 ? (
          <p className="text-sm text-muted">{t("אין תבניות בסיס עדיין. אפשר ליצור מרפאה בלי תבניות, ולהוסיף אחר כך.")}</p>
        ) : (
          <div className="space-y-2">
            {bases.map((b) => (
              <label key={b.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-white/50 px-3 py-2">
                <input type="checkbox" name="templates" value={b.id} checked={picked.includes(b.id)}
                  onChange={() => toggle(b.id)} className="size-5 shrink-0 accent-accent" />
                <span className="min-w-0 break-words">{b.name}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <div className="space-y-3">
        {state?.error && (
          <p role="alert" id="new-clinic-error" className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>
        )}
        <button className="btn btn-primary w-full sm:w-auto" disabled={pending}>{pending ? t("יוצר…") : t("יצירת מרפאה")}</button>
      </div>
    </form>
  );
}
