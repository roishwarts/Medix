"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { formatDateLong } from "@/lib/dates";
import { cancelJourney, uncancelJourney, CANCEL_REASONS, type CancelReason } from "../actions";

const REASON_LABEL: Record<CancelReason, string> = {
  patient_request: "בקשת המטופל",
  medical: "שינוי במצב הרפואי",
  insurance: "ביטוח / מימון",
  clinic_schedule: "שינוי בלו״ז המרפאה",
  other: "אחר",
};

export function CancelJourney({
  journeyId,
  lang,
  cancelledAt,
  cancelledReason,
}: {
  journeyId: string;
  lang: "he" | "en" | "ru" | "ar";
  cancelledAt: string | null;
  cancelledReason: CancelReason | null;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CancelReason>("patient_request");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (cancelledAt) {
    return (
      <div className="card border-s-4 border-s-bad bg-bad/5 px-4 py-3">
        <p className="font-medium text-bad">{t("הניתוח בוטל")}</p>
        <p className="mt-0.5 text-sm text-muted">
          {t("סיבה: {reason} · {date}", { reason: t(REASON_LABEL[cancelledReason ?? "other"]), date: formatDateLong(cancelledAt, lang) })}
        </p>
        <button
          type="button"
          className="mt-2 text-sm font-medium text-accent hover:underline"
          disabled={pending}
          onClick={() => start(async () => { await uncancelJourney(journeyId); })}
        >
          {t("ביטול הסימון (זה טעות)")}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-sm min-h-11 !text-bad sm:min-h-9">
        {t("ביטול הניתוח")}
      </button>
    );
  }

  return (
    <div className="card space-y-3 px-4 py-3">
      <p className="font-medium">{t("סימון הניתוח כמבוטל")}</p>
      <div>
        <label htmlFor="cancel-reason" className="lbl">{t("סיבת הביטול")}</label>
        <select id="cancel-reason" className="field" value={reason} onChange={(e) => setReason(e.target.value as CancelReason)}>
          {CANCEL_REASONS.map((r) => <option key={r} value={r}>{t(REASON_LABEL[r])}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary btn-sm min-h-11 !bg-bad sm:min-h-9"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const res = await cancelJourney(journeyId, reason);
              if (res.error) setError(res.error);
              else setOpen(false);
            });
          }}
        >
          {pending ? t("מבטל…") : t("אישור הביטול")}
        </button>
        <button type="button" className="btn btn-sm min-h-11 sm:min-h-9" onClick={() => setOpen(false)}>{t("ביטול")}</button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </div>
    </div>
  );
}
