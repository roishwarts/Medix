"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROLE_LABEL, type ActivityItem } from "@/lib/activity";
import { markActivitySeen } from "@/app/clinic/activity/actions";

// Items marked "new" stay marked while the page is open, even though opening it counts them as seen.
export function ActivityList({ items, showPatient = true, markSeen = false }: { items: ActivityItem[]; showPatient?: boolean; markSeen?: boolean }) {
  const [newIds] = useState(() => new Set(items.filter((i) => i.isNew).map((i) => i.id)));

  useEffect(() => {
    if (markSeen) void markActivitySeen();
  }, [markSeen]);

  if (items.length === 0) return <p className="card px-4 py-10 text-center text-muted">אין עדכונים להצגה.</p>;

  return (
    <ul className="card divide-y divide-line">
      {items.map((i) => (
        <li key={i.id}>
          <Link href={i.href} className="flex items-start gap-3 px-4 py-3 link-row">
            <span className={`mt-2 size-2 shrink-0 rounded-full ${newIds.has(i.id) ? "bg-accent" : "bg-transparent"}`} aria-label={newIds.has(i.id) ? "חדש" : undefined} />
            <span className="min-w-0 flex-1">
              {showPatient && i.patientName && <span className="block font-medium">{i.patientName}</span>}
              <span className="block text-muted">
                {i.text}
                {i.role && <span className="pill pill-neutral ms-2 align-middle">{ROLE_LABEL[i.role] ?? i.role}</span>}
              </span>
              {i.note && <span className="mt-0.5 block text-sm text-bad">הערה: {i.note}</span>}
            </span>
            <span className="shrink-0 text-sm text-muted">{i.when}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
