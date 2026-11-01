"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { startAdditionalJourney } from "../actions";

export function StartJourney({ patientId, templates }: { patientId: string; templates: { id: string; name: string }[] }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (templates.length === 0) return null;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-sm min-h-11 !px-3 sm:min-h-9">
        {t("התחלת מסלול נוסף")}
      </button>
    );
  }

  return (
    <div className="card mt-2 space-y-3 p-4">
      <p className="font-medium">{t("מסלול נוסף למטופל הזה")}</p>
      <p className="text-sm text-muted">{t("לדוגמה: ניתוח בברך השנייה, או ניתוח חוזר — המטופל יראה את שני המסלולים בנפרד.")}</p>
      <div>
        <label htmlFor="new-journey-template" className="lbl">{t("תבנית")}</label>
        <select id="new-journey-template" className="field" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="new-journey-date" className="lbl">{t("תאריך ניתוח")}</label>
        <input id="new-journey-date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary btn-sm min-h-11 sm:min-h-9"
          disabled={pending}
          onClick={() => {
            if (!date) { setError(t("יש לבחור תאריך ניתוח")); return; }
            setError(null);
            start(async () => {
              const res = await startAdditionalJourney(patientId, templateId, date);
              if (res.error) setError(res.error);
              else if (res.journeyId) router.push(`/clinic/patients/${res.journeyId}`);
            });
          }}
        >
          {pending ? t("פותח…") : t("פתיחת המסלול")}
        </button>
        <button type="button" className="btn btn-sm min-h-11 sm:min-h-9" onClick={() => setOpen(false)}>{t("ביטול")}</button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </div>
    </div>
  );
}
