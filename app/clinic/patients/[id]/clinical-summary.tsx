"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { VoiceTextarea } from "@/components/voice-input";
import { saveClinicalSummary } from "./clinical-actions";

export type ClinicalData = {
  diagnosis: string | null;
  side: "left" | "right" | "both" | null;
  allergies: string | null;
  medications: string | null;
  medicalHistory: string | null;
  notes: string | null;
};

const EMPTY: ClinicalData = { diagnosis: null, side: null, allergies: null, medications: null, medicalHistory: null, notes: null };

// The first thing on the patient card: what is being operated on and what the surgeon must not miss.
// Everyone on staff reads it; only the doctor edits it.
export function ClinicalSummary({
  journeyId, procedure, hospital, data, canEdit, available,
}: {
  journeyId: string; procedure: string; hospital: string; data: ClinicalData | null; canEdit: boolean; available: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const d = data ?? EMPTY;
  const SIDE = { left: t("שמאל"), right: t("ימין"), both: t("דו-צדדי") } as const;
  const hasAny = !!(d.diagnosis || d.side || d.allergies || d.medications || d.medicalHistory || d.notes);

  if (!available && !canEdit) return null;

  if (editing) {
    return (
      <section aria-label={t("סיכום קליני")} className="card p-4">
        <ClinicalForm journeyId={journeyId} initial={d} onClose={() => setEditing(false)} />
      </section>
    );
  }

  return (
    <section aria-label={t("סיכום קליני")} className="card divide-y divide-line">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <h2 className="eyebrow">{t("סיכום קליני")}</h2>
          <p className="mt-0.5 font-medium">
            {procedure}
            {d.side && <span className="ms-2 pill pill-neutral">{SIDE[d.side]}</span>}
            {hospital && <span className="ms-2 text-sm font-normal text-muted">{hospital}</span>}
          </p>
        </div>
        {canEdit && available && (
          <button type="button" className="btn btn-sm min-h-11 sm:min-h-9" onClick={() => setEditing(true)}>
            {hasAny ? t("עריכה") : t("הוספת סיכום קליני")}
          </button>
        )}
      </div>

      {!available && canEdit && (
        <p className="px-4 py-3 text-sm text-muted">{t("יש להריץ את supabase/patch-doctor-queue.sql כדי להפעיל את הסיכום הקליני.")}</p>
      )}
      {available && !hasAny && (
        <p className="px-4 py-3 text-sm text-muted">{canEdit ? t("עוד לא הוזן סיכום קליני למטופל הזה.") : t("הרופא עוד לא הוסיף סיכום קליני.")}</p>
      )}
      {available && hasAny && (
        <dl className="grid gap-x-8 gap-y-3 px-4 py-3 text-sm sm:grid-cols-2">
          {d.diagnosis && <Item label={t("אבחנה")} value={d.diagnosis} />}
          {d.allergies && <Item label={t("אלרגיות")} value={d.allergies} warn />}
          {d.medications && <Item label={t("תרופות קבועות")} value={d.medications} />}
          {d.medicalHistory && <Item label={t("רקע רפואי")} value={d.medicalHistory} />}
          {d.notes && <Item label={t("הערות לניתוח")} value={d.notes} wide />}
        </dl>
      )}
    </section>
  );
}

function Item({ label, value, warn, wide }: { label: string; value: string; warn?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className={`text-xs ${warn ? "font-medium text-bad" : "text-muted"}`}>{label}</dt>
      <dd className={`mt-0.5 whitespace-pre-wrap break-words ${warn ? "font-medium text-bad" : ""}`}>{value}</dd>
    </div>
  );
}

function ClinicalForm({ journeyId, initial, onClose }: { journeyId: string; initial: ClinicalData; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState(initial.diagnosis ?? "");
  const [side, setSide] = useState<"" | "left" | "right" | "both">(initial.side ?? "");
  const [allergies, setAllergies] = useState(initial.allergies ?? "");
  const [medications, setMedications] = useState(initial.medications ?? "");
  const [medicalHistory, setMedicalHistory] = useState(initial.medicalHistory ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await saveClinicalSummary({ journeyId, diagnosis, side, allergies, medications, medicalHistory, notes });
      if (res.error) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="eyebrow">{t("סיכום קליני")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="lbl" htmlFor="cs-dx">{t("אבחנה")}</label>
          <input id="cs-dx" className="field" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </div>
        <div>
          <label className="lbl" htmlFor="cs-side">{t("צד")}</label>
          <select id="cs-side" className="field" value={side} onChange={(e) => setSide(e.target.value as typeof side)}>
            <option value="">{t("לא רלוונטי")}</option>
            <option value="right">{t("ימין")}</option>
            <option value="left">{t("שמאל")}</option>
            <option value="both">{t("דו-צדדי")}</option>
          </select>
        </div>
      </div>
      <div>
        <label className="lbl" htmlFor="cs-allergy">{t("אלרגיות")}</label>
        <VoiceTextarea id="cs-allergy" className="field min-h-16" value={allergies} onChange={setAllergies} />
      </div>
      <div>
        <label className="lbl" htmlFor="cs-meds">{t("תרופות קבועות")}</label>
        <VoiceTextarea id="cs-meds" className="field min-h-16" value={medications} onChange={setMedications} />
      </div>
      <div>
        <label className="lbl" htmlFor="cs-history">{t("רקע רפואי")}</label>
        <VoiceTextarea id="cs-history" className="field min-h-20" value={medicalHistory} onChange={setMedicalHistory} />
      </div>
      <div>
        <label className="lbl" htmlFor="cs-notes">{t("הערות לניתוח")}</label>
        <VoiceTextarea id="cs-notes" className="field min-h-20" value={notes} onChange={setNotes} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={save}>
          {pending ? t("שומר…") : t("שמירה")}
        </button>
        <button type="button" className="btn btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={onClose}>{t("ביטול")}</button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </div>
    </div>
  );
}
