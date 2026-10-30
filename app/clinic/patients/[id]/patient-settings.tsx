"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { LANGS, type Lang } from "@/lib/prefs";
import { STAGES, STAGE_LABEL, STAGE_PILL, type Stage } from "@/lib/journey";
import { setPatientLang, setPatientStage } from "../actions";

// What staff can set by hand for a patient: the status (replacing the automatic one) and the message language.
export function PatientSettings({ patientId, autoStage, stage, lang }: { patientId: string; autoStage: Stage; stage: Stage | null; lang: Lang }) {
  const t = useT();
  const [manual, setManual] = useState<Stage | "">(stage ?? "");
  const [language, setLanguage] = useState<Lang>(lang);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = manual || autoStage;

  return (
    <div className="card mt-6 grid gap-4 p-4 sm:grid-cols-2">
      <div>
        <label htmlFor="ps-stage" className="lbl">{t("סטטוס המטופל (ידני)")}</label>
        <div className="flex items-center gap-3">
          <select id="ps-stage" className="field" value={manual} disabled={pending}
            onChange={(e) => {
              const v = e.target.value as Stage | "";
              setManual(v); setError(null);
              start(async () => { const res = await setPatientStage(patientId, v || null); if (res.error) setError(res.error); });
            }}>
            <option value="">{t("אוטומטי לפי המסלול")}</option>
            {STAGES.map((s) => <option key={s} value={s}>{t(STAGE_LABEL[s])}</option>)}
          </select>
          <span className={`pill shrink-0 ${STAGE_PILL[shown]}`}>{t(STAGE_LABEL[shown])}{manual ? ` · ${t("ידני")}` : ""}</span>
        </div>
        <p className="mt-1.5 text-xs text-muted">{t("אפשר לקבוע סטטוס ידנית. הוא מחליף את החישוב האוטומטי עד שתחזרו לאוטומטי.")}</p>
      </div>
      <div>
        <label htmlFor="ps-lang" className="lbl">{t("שפת ההודעות והאפליקציה")}</label>
        <select id="ps-lang" className="field" value={language} disabled={pending}
          onChange={(e) => {
            const v = e.target.value as Lang;
            setLanguage(v); setError(null);
            start(async () => { const res = await setPatientLang(patientId, v); if (res.error) setError(res.error); });
          }}>
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <p className="mt-1.5 text-xs text-muted">{t("ההודעות בוואטסאפ ובמייל נשלחות בשפה הזו.")}</p>
      </div>
      {error && <p role="alert" className="text-sm text-bad sm:col-span-2">{error}</p>}
    </div>
  );
}
