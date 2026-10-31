"use client";

import { useT } from "@/components/i18n-provider";
import { useActionState } from "react";
import { createReferral } from "../actions";

export function ReferralForm({ patientId }: { patientId: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(createReferral, undefined);
  return (
    <form action={action} className="card mt-2 grid gap-4 p-4 sm:p-5">
      <input type="hidden" name="patient_id" value={patientId} />
      <div>
        <label htmlFor="recipient" className="lbl">{t("לכבוד (נמען ההפניה)")}</label>
        <input id="recipient" name="recipient" className="field" placeholder={t("לדוגמה: מכון דימות / ד״ר כהן, אורתופד")} required />
      </div>
      <div>
        <label htmlFor="reason" className="lbl">{t("סיבת ההפניה")}</label>
        <input id="reason" name="reason" className="field" placeholder={t("לדוגמה: בדיקת MRI לברך ימין")} required />
      </div>
      <div>
        <label htmlFor="body" className="lbl">{t("פירוט נוסף (אופציונלי)")}</label>
        <textarea id="body" name="body" className="field min-h-28" placeholder={t("רקע קליני, ממצאים, בקשות ספציפיות…")} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary min-h-11 max-sm:w-full" disabled={pending}>{pending ? t("יוצר…") : t("יצירת ההפניה")}</button>
        {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      </div>
    </form>
  );
}
