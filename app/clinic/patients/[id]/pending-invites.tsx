"use client";

import { useT } from "@/components/i18n-provider";
import { useState, useTransition } from "react";
import { revokeInviteByStaff } from "../actions";

export function PendingInvites({ items }: { items: { id: string; name: string; relation: string; canAct: boolean; expires: string; expired: boolean }[] }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (items.length === 0) return null;
  const expiredCount = items.filter((i) => i.expired).length;
  return (
    <div className="mt-3">
      <p className="eyebrow mb-2">{t("הזמנות שממתינות")}</p>
      {expiredCount > 0 && (
        <p role="status" className="mb-2 text-sm text-bad">
          {expiredCount === 1 ? t("הזמנה אחת פגה ולא נוצלה — אפשר להזמין מחדש בטופס שלמטה.") : t("{n} הזמנות פגו ולא נוצלו — אפשר להזמין מחדש בטופס שלמטה.", { n: expiredCount })}
        </p>
      )}
      <ul className="card divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                {i.name ? `${i.name} · ${i.relation}` : i.relation}
                {i.expired && <span className="pill pill-bad ms-2 align-middle">{t("פג תוקף")}</span>}
              </p>
              <p className="text-sm text-muted">
                {i.canAct ? t("עם הרשאת פעולה") : t("צפייה בלבד")} · {i.expired ? t("פג תוקף ב-{date}", { date: i.expires }) : t("תקפה עד {date}", { date: i.expires })}
              </p>
            </div>
            {!i.expired && (
              <button
                className="btn btn-sm min-h-11 shrink-0 sm:min-h-9"
                aria-label={t("ביטול ההזמנה ל{name}", { name: i.name || i.relation })}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    setError(null);
                    const res = await revokeInviteByStaff(i.id);
                    if (res?.error) setError(res.error);
                  })
                }
              >
                {t("ביטול")}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
