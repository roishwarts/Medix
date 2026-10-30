"use client";

import { useT } from "@/components/i18n-provider";
import { useTransition } from "react";
import { revokeInviteByStaff } from "../actions";

export function PendingInvites({ items }: { items: { id: string; name: string; relation: string; canAct: boolean; expires: string }[] }) {
  const t = useT();
  const [pending, start] = useTransition();
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="eyebrow mb-2">{t("הזמנות שממתינות")}</p>
      <ul className="card divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{i.name ? `${i.name} · ${i.relation}` : i.relation}</p>
              <p className="text-sm text-muted">{i.canAct ? t("עם הרשאת פעולה") : t("צפייה בלבד")} · {t("תקפה עד {date}", { date: i.expires })}</p>
            </div>
            <button className="btn btn-sm min-h-11 shrink-0 sm:min-h-9" aria-label={t("ביטול ההזמנה ל{name}", { name: i.name || i.relation })} disabled={pending} onClick={() => start(async () => { await revokeInviteByStaff(i.id); })}>{t("ביטול")}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
