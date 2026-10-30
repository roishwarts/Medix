"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROLE_LABEL, type ActivityItem } from "@/lib/activity";
import { useT } from "@/components/i18n-provider";
import { markActivitySeen } from "@/app/clinic/activity/actions";

// Items marked "new" stay marked while the page is open, even though opening it counts them as seen.
export function ActivityList({ items, showPatient = true, markSeen = false }: { items: ActivityItem[]; showPatient?: boolean; markSeen?: boolean }) {
  const t = useT();
  const [newIds] = useState(() => new Set(items.filter((i) => i.isNew).map((i) => i.id)));

  useEffect(() => {
    if (markSeen) void markActivitySeen();
  }, [markSeen]);

  if (items.length === 0) return <p className="card px-4 py-10 text-center text-muted">{t("אין עדכונים להצגה.")}</p>;

  return (
    <ul className="card divide-y divide-line">
      {items.map((i) => (
        <li key={i.id}>
          <Link href={i.href} className="flex items-start gap-3 px-4 py-3 link-row">
            <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${newIds.has(i.id) ? "bg-accent" : "bg-transparent"}`} />
            <span className="min-w-0 flex-1">
              {newIds.has(i.id) && <span className="sr-only">{t("חדש:")} </span>}
              {showPatient && i.patientName && <span className="block font-medium"><bdi>{i.patientName}</bdi></span>}
              <span className="block text-muted">
                <bdi>{i.text}</bdi>
                {i.role && <span className="pill pill-neutral ms-2 align-middle">{t(ROLE_LABEL[i.role] ?? i.role)}</span>}
              </span>
              {i.note && <span className="mt-0.5 block text-sm text-bad">{t("הערה: {note}", { note: i.note })}</span>}
            </span>
            <span className="num shrink-0 whitespace-nowrap text-sm text-muted">{i.when}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
