"use client";

import { useT } from "@/components/i18n-provider";
import { useState } from "react";
import { ShareLink } from "@/components/share-link";
import { createResetLinkFromRequest, type LinkResult } from "./patients/actions";

export type ResetRequestItem = { id: string; name: string; role: string; when: string };

// Patients and caregivers who tapped "forgot password": the secretary sends each a reset link.
export function ResetRequests({ items }: { items: ResetRequestItem[] }) {
  const t = useT();
  const [results, setResults] = useState<Record<string, LinkResult>>({});
  // A request leaves the server's list as soon as its link exists, so keep the row on screen
  // until the page is left; otherwise the send buttons would vanish before they can be used.
  const [kept, setKept] = useState<Record<string, ResetRequestItem>>({});
  // Tracked per request id (not a single shared flag) so a morning backlog of several requests
  // can be worked through one click after another without each row waiting on the previous one.
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const rows = [...items, ...Object.values(kept).filter((k) => !items.some((i) => i.id === k.id))];
  if (rows.length === 0) return null;

  async function handleCreate(r: ResetRequestItem) {
    setBusyIds((s) => new Set(s).add(r.id));
    try {
      const out = await createResetLinkFromRequest(r.id);
      setResults((m) => ({ ...m, [r.id]: out }));
      if (out.link) setKept((m) => ({ ...m, [r.id]: r }));
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(r.id);
        return next;
      });
    }
  }

  return (
    <section aria-labelledby="h-resets">
      <h2 id="h-resets" className="mb-3 flex items-baseline gap-2 text-lg font-medium">
        {t("בקשות איפוס סיסמה")} <span className="num text-sm text-muted">{rows.length}</span>
      </h2>
      <div className="card divide-y divide-line">
        {rows.map((r) => {
          const res = results[r.id];
          return (
            <div key={r.id} className="space-y-3 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{r.name}</p>
                  <p className="text-sm text-muted">{r.role === "caregiver" ? t("בן משפחה") : t("מטופל")} · {t("בקשה מתאריך {date}", { date: r.when })}</p>
                </div>
                {!res?.link && (
                  <button
                    className="btn btn-sm min-h-11"
                    disabled={busyIds.has(r.id)}
                    onClick={() => handleCreate(r)}
                  >
                    {busyIds.has(r.id) ? t("יוצר…") : t("יצירת קישור לאיפוס")}
                  </button>
                )}
              </div>
              <div aria-live="polite">
                {res?.error && <p role="alert" className="text-sm text-bad">{res.error}</p>}
                {res?.link && res.message && (
                  <ShareLink link={res.link} message={res.message} phone={res.phone} email={res.email} emailSubject={t("איפוס סיסמה")} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
