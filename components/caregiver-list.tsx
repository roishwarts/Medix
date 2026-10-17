"use client";

import { useState, useTransition } from "react";
import { removeCaregiver, setCaregiverPermission } from "@/app/(patient)/family/actions";

export type CaregiverItem = { id: string; name: string; relation: string; canAct: boolean; since: string };

export function CaregiverList({ items, isPatient }: { items: CaregiverItem[]; isPatient: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  };

  if (items.length === 0) return <p className="card px-4 py-6 text-center text-muted">אין בני משפחה מקושרים.</p>;

  return (
    <div>
      <ul className="card divide-y divide-line">
        {items.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{c.name} <span className="font-normal text-muted">· {c.relation}</span></p>
              <p className="text-sm text-muted">
                {c.canAct ? "יכול/ה לפעול בשמך" : "צפייה בלבד"} · מאז {c.since}
              </p>
            </div>
            <div className="flex gap-2">
              {isPatient && (
                <button className="btn btn-sm" disabled={pending}
                  onClick={() => run(() => setCaregiverPermission(c.id, !c.canAct))}>
                  {c.canAct ? "הגבלה לצפייה" : "מתן הרשאת פעולה"}
                </button>
              )}
              <button className="btn btn-danger btn-sm" disabled={pending}
                onClick={() => { if (confirm(`להסיר את ${c.name}? הגישה תיחסם מיד.`)) run(() => removeCaregiver(c.id)); }}>
                הסרה
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
