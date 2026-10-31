"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/ui";
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
      <div className="card px-4 py-12 text-center">
        <p className="text-muted">{t("אין בני משפחה מקושרים.")}</p>
        <p className="mt-1 text-sm text-muted">{t("אפשר להזמין בן משפחה או מלווה בטופס שמתחת.")}</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="card divide-y divide-line">
        {items.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1 basis-48">
              <p className="break-words font-medium">{c.name} <span className="font-normal text-muted">· {c.relation}</span></p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className={`pill ${c.canAct ? "pill-info" : "pill-neutral"}`}>
                  <Icon name={c.canAct ? "check" : "lock"} size={11} /> {c.canAct ? t("יכול/ה לפעול בשמך") : t("צפייה בלבד")}
                </span>
                <span>{t("מאז {date}", { date: c.since })}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isPatient && (
                <button className="btn btn-sm" disabled={pending}
                  onClick={() => run(() => setCaregiverPermission(c.id, !c.canAct))}>
                  {c.canAct ? t("הגבלה לצפייה בלבד") : t("מתן הרשאת פעולה")}
                </button>
              )}
              {confirming === c.id ? (
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("הסרת הגישה של {name}", { name: c.name })}>
                  <span className="text-sm">{t("להסיר את הגישה של {name}? הם ייחסמו מהמסע באופן מיידי.", { name: c.name })}</span>
                  <button className="btn btn-danger btn-sm" disabled={pending}
                    onClick={() => { setConfirming(null); run(() => removeCaregiver(c.id)); }}>
                    {pending ? t("מסיר…") : t("כן, להסיר")}
                  </button>
                  <button className="btn btn-quiet btn-sm" disabled={pending} onClick={() => setConfirming(null)}>{t("חזרה")}</button>
                </div>
              ) : (
                <button className="btn btn-danger btn-sm" disabled={pending} aria-label={t("הסרת הגישה של {name}", { name: c.name })}
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
