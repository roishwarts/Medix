"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { removeCaregiver, setCaregiverPermission } from "@/app/(patient)/family/actions";

export type CaregiverItem = { id: string; name: string; relation: string; canAct: boolean; since: string };

export function CaregiverList({ items, isPatient }: { items: CaregiverItem[]; isPatient: boolean }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  };

  if (items.length === 0) {
    return (
      <div className="card px-4 py-6 text-center">
        <p className="text-muted">{t("אין בני משפחה מקושרים.")}</p>
        <p className="mt-1 text-sm text-muted">{t("אפשר להזמין בן משפחה בטופס שמתחת.")}</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="card divide-y divide-line">
        {items.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{c.name} <span className="font-normal text-muted">· {c.relation}</span></p>
              <p className="text-sm text-muted">
                {c.canAct ? t("יכול/ה לפעול בשמך") : t("צפייה בלבד")} · {t("מאז {date}", { date: c.since })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isPatient && (
                <button className="btn btn-sm" disabled={pending}
                  onClick={() => run(() => setCaregiverPermission(c.id, !c.canAct))}>
                  {c.canAct ? t("הגבלה לצפייה") : t("מתן הרשאת פעולה")}
                </button>
              )}
              {confirming === c.id ? (
                <>
                  <button className="btn btn-danger btn-sm" disabled={pending}
                    onClick={() => { setConfirming(null); run(() => removeCaregiver(c.id)); }}>
                    {t("להסיר את {name}? הגישה תיחסם", { name: c.name })}
                  </button>
                  <button className="btn btn-quiet btn-sm" onClick={() => setConfirming(null)}>{t("ביטול")}</button>
                </>
              ) : (
                <button className="btn btn-danger btn-sm" disabled={pending} aria-label={t("הסרת {name}", { name: c.name })}
                  onClick={() => setConfirming(c.id)}>
                  {t("הסרה")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
