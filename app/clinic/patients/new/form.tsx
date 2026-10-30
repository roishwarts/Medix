"use client";

import { useT } from "@/components/i18n-provider";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ShareLink } from "@/components/share-link";
import { OptionSelect } from "@/components/option-select";
import { createPatient } from "../actions";

export function NewPatientForm({ templates, hospitals, companies }: { templates: { id: string; name: string }[]; hospitals: string[]; companies: string[] }) {
  const t = useT();
  const [state, action, pending] = useActionState(createPatient, undefined);
  const created = state?.created;
  // Server errors make React reset the form; remember what was typed so it survives.
  const [kept, setKept] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const doneRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (created) doneRef.current?.focus(); }, [created]);
  const v = (k: string) => kept[k] ?? "";

  function submit(fd: FormData) {
    const next: Record<string, string> = {};
    for (const k of ["full_name", "phone", "email", "template_id", "surgery_date", "hospital", "company"]) next[k] = String(fd.get(k) ?? "");
    setKept(next);
    setAttempt((n) => n + 1);
    action(fd);
  }

  if (created) {
    return (
      <div className="mt-8 space-y-6">
        <div className="card space-y-4 p-5">
          <div>
            <p className="eyebrow">{t("המטופל נוצר")}</p>
            <h2 ref={doneRef} tabIndex={-1} className="display mt-1 text-2xl outline-none">{created.patientName}</h2>
            <p className="mt-1 text-muted">{t("עכשיו אפשר לשלוח לו הזמנה ליצירת משתמש.")}</p>
          </div>
          {created.link && created.message ? (
            <ShareLink link={created.link} message={created.message} phone={created.phone} email={created.email} emailSubject={t("הזמנה להצטרפות")} />
          ) : (
            <p role="alert" className="text-sm text-bad">{created.linkError ?? t("לא ניתן ליצור קישור")}. {t("אפשר ליצור קישור מכרטיס המטופל.")}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/clinic/patients/${created.journeyId}`} className="btn btn-primary">{t("מעבר לכרטיס המטופל")}</Link>
          <a href="/clinic/patients/new" className="btn">{t("מטופל נוסף")}</a>
        </div>
        <p className="text-sm text-muted">{t("בכרטיס המטופל אפשר להוסיף בני משפחה ולשלוח להם הזמנה.")}</p>
      </div>
    );
  }

  return (
    <form action={submit} className="mt-8 space-y-5" aria-busy={pending}>
      <div>
        <label htmlFor="full_name" className="lbl">{t("שם מלא")}</label>
        <input id="full_name" name="full_name" className="field" autoComplete="off" defaultValue={v("full_name")} aria-describedby={state?.error ? "form-error" : undefined} required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="lbl">{t("טלפון (לשליחה בוואטסאפ)")}</label>
          <input id="phone" name="phone" className="field" dir="ltr" type="tel" inputMode="tel" autoComplete="off" placeholder="050-0000000" defaultValue={v("phone")} aria-describedby={state?.error ? "form-error" : undefined} required />
        </div>
        <div>
          <label htmlFor="email" className="lbl">{t("מייל (לא חובה)")}</label>
          <input id="email" name="email" type="email" className="field" dir="ltr" inputMode="email" autoComplete="off" defaultValue={v("email")} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="template_id" className="lbl">{t("תבנית")}</label>
          <select key={`t${attempt}`} id="template_id" name="template_id" className="field" defaultValue={v("template_id") || undefined} required>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="surgery_date" className="lbl">{t("תאריך ניתוח")}</label>
          <input id="surgery_date" name="surgery_date" type="date" className="field" defaultValue={v("surgery_date")} required />
        </div>
      </div>
      {(hospitals.length > 0 || companies.length > 0) && (
        <div className="grid gap-5 sm:grid-cols-2">
          <OptionSelect id="hospital" name="hospital" label={t("בית חולים (לא חובה)")} options={hospitals} current={v("hospital") || null} key={`h${attempt}`} />
          <OptionSelect id="company" name="company" label={t("חברה (לא חובה)")} options={companies} current={v("company") || null} key={`c${attempt}`} />
        </div>
      )}
      {state?.error && <p id="form-error" role="alert" className="rounded-xl border border-bad/30 bg-bad/5 px-4 py-3 text-sm text-bad">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>{pending ? t("יוצר…") : t("יצירת מטופל והכנת הזמנה")}</button>
    </form>
  );
}
