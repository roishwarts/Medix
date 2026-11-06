"use client";

import { LANGS } from "@/lib/prefs";
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
  // Surgery (template + date) or follow-up (just the person; the surgery journey can be started later).
  const [kind, setKind] = useState<"surgery" | "followup">(templates.length > 0 ? "surgery" : "followup");
  const doneRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (created) doneRef.current?.focus(); }, [created]);
  // A failed submission re-renders the same form (no navigation), so move focus to the error for
  // keyboard and screen-reader users instead of leaving focus on a button that no longer explains why.
  useEffect(() => { if (state?.error) errorRef.current?.focus(); }, [state?.error]);
  const v = (k: string) => kept[k] ?? "";
  const describedBy = state?.error ? "form-error" : undefined;

  function submit(fd: FormData) {
    const next: Record<string, string> = {};
    for (const k of ["full_name", "phone", "email", "template_id", "surgery_date", "hospital", "company", "lang"]) next[k] = String(fd.get(k) ?? "");
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
          <Link href={created.journeyId ? `/clinic/patients/${created.journeyId}` : `/clinic/patients/follow/${created.patientId}`} className="btn btn-primary">{t("מעבר לכרטיס המטופל")}</Link>
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
        <input id="full_name" name="full_name" className="field" autoComplete="off" maxLength={80} defaultValue={v("full_name")} aria-describedby={describedBy} required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="lbl">{t("טלפון (לשליחה בוואטסאפ)")}</label>
          <input id="phone" name="phone" className="field" dir="ltr" type="tel" inputMode="tel" autoComplete="off" placeholder="050-0000000" pattern="[0-9+\-\s()]{8,30}" maxLength={30} defaultValue={v("phone")} aria-describedby={describedBy} required />
        </div>
        <div>
          <label htmlFor="email" className="lbl">{t("מייל (לא חובה)")}</label>
          <input id="email" name="email" type="email" className="field" dir="ltr" inputMode="email" autoComplete="off" defaultValue={v("email")} aria-describedby={describedBy} />
        </div>
      </div>
      <fieldset>
        <legend className="lbl">{t("סוג המטופל")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
          {([["surgery", t("לניתוח")], ["followup", t("למעקב")]] as const).map(([k, label]) => (
            <label key={k} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-medium ${kind === k ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface"}`}>
              <input type="radio" name="kind" value={k} checked={kind === k} disabled={k === "surgery" && templates.length === 0} onChange={() => setKind(k)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        {kind === "followup" && <p className="mt-1.5 text-xs text-muted">{t("מטופל למעקב נשמר ללא ניתוח ותאריך. כשיהיה ניתוח, מתחילים לו מסלול מכרטיס המטופל.")}</p>}
      </fieldset>
      {kind === "surgery" && (
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="template_id" className="lbl">{t("תבנית")}</label>
          <select key={`t${attempt}`} id="template_id" name="template_id" className="field" defaultValue={v("template_id") || undefined} aria-describedby={describedBy} required>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="surgery_date" className="lbl">{t("תאריך ניתוח")}</label>
          <input id="surgery_date" name="surgery_date" type="date" className="field" defaultValue={v("surgery_date")} aria-describedby={describedBy} required />
        </div>
      </div>
      )}
      <div className="max-w-xs">
        <label htmlFor="lang" className="lbl">{t("שפת ההודעות והאפליקציה")}</label>
        <select key={`l${attempt}`} id="lang" name="lang" className="field" defaultValue={v("lang") || "he"}>
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <p className="mt-1.5 text-xs text-muted">{t("ההודעות בוואטסאפ ובמייל נשלחות בשפה הזו.")}</p>
      </div>
      {(hospitals.length > 0 || companies.length > 0) && (
        <div className="grid gap-5 sm:grid-cols-2">
          <OptionSelect id="hospital" name="hospital" label={t("בית חולים (לא חובה)")} options={hospitals} current={v("hospital") || null} key={`h${attempt}`} />
          <OptionSelect id="company" name="company" label={t("חברה (לא חובה)")} options={companies} current={v("company") || null} key={`c${attempt}`} />
        </div>
      )}
      {state?.error && <p id="form-error" ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-bad/30 bg-bad/5 px-4 py-3 text-sm text-bad outline-none">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>{pending ? t("יוצר…") : t("יצירת מטופל והכנת הזמנה")}</button>
    </form>
  );
}
