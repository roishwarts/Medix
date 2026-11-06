"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { queueOrRun } from "@/lib/offline/queue";
import { toast } from "@/components/toast";
import { Icon } from "@/components/ui";
import type { ActionKind } from "@/lib/journey";

const SVG = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

// One "needs attention" row on the secretary's / doctor's home: who, what, why, and the action right there.
// Phone: icon-only reminder and call + "done"; desktop: text buttons. Waiting-for-review rows get
// approve / return (returning needs a note, so it opens the patient's card).
export function HomeTaskRow({
  taskId, href, kind, patientName, title, status, urgent, phone, reminderHref, hidden,
}: {
  taskId: string; href: string; kind: ActionKind; patientName: string; title: string; status: string; urgent: boolean;
  phone: string | null; reminderHref: string | null; hidden?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (done) return null;

  function accept() {
    setError(null);
    start(async () => {
      const result = await queueOrRun({ kind: "staff_accept", taskId });
      if (result.rejected) { setError(t("הפעולה נכשלה. ייתכן שהמשימה כבר טופלה אחרת — רענן/י ונסה/י שוב.")); return; }
      if (result.queued) toast(t("אין חיבור לרגע — השמירה בוצעה במכשיר ותישלח אוטומטית כשהחיבור יחזור."));
      setDone(true);
      router.refresh();
    });
  }

  const review = kind === "review";
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
  const first = patientName.trim().charAt(0);
  return (
    <div className={`px-4 py-3 ${hidden ? "max-sm:hidden" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 sm:flex-nowrap">
        <Link href={href} className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-auto">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-semibold text-accent">{first}</span>
          <span className="min-w-0 flex-1">
            <span className="block break-words font-medium">{patientName}</span>
            <span className="block break-words text-sm text-muted">{title}</span>
          </span>
          <span className={`pill shrink-0 ${urgent ? "pill-bad" : "pill-warn"}`}>{status}</span>
        </Link>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
          {review ? (
            <>
              <button type="button" onClick={accept} disabled={pending} className="btn btn-primary btn-sm min-h-11 flex-1 sm:min-h-9 sm:flex-none">
                {pending ? t("שומר…") : t("אישור")}
              </button>
              <Link href={href} className="btn btn-sm min-h-11 flex-1 sm:min-h-9 sm:flex-none">
                <span className="sm:hidden">{t("החזרה לתיקון")}</span><span className="max-sm:hidden">{t("החזרה")}</span>
              </Link>
            </>
          ) : (
            <>
              {reminderHref && (
                <a href={reminderHref} target="_blank" rel="noopener noreferrer" className="btn btn-sm min-h-11 min-w-11 shrink-0 !px-3 sm:min-h-9 sm:min-w-0" aria-label={t("שליחת תזכורת")}>
                  <span className="sm:hidden"><svg {...SVG}><path d="M4 5h16v11H9l-5 4z" /></svg></span>
                  <span className="max-sm:hidden inline-flex items-center gap-1.5"><Icon name="clock" size={14} />{t("תזכורת")}</span>
                </a>
              )}
              {telHref && (
                <a href={telHref} className="btn btn-sm min-h-11 min-w-11 shrink-0 !px-3 sm:hidden" aria-label={t("התקשרות ל{name}", { name: patientName.split(" ")[0] })}>
                  <svg {...SVG}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
                </a>
              )}
              <button type="button" onClick={accept} disabled={pending} className="btn btn-sm min-h-11 flex-1 sm:min-h-9 sm:flex-none">
                <span className="sm:hidden inline-flex items-center gap-1.5"><svg {...SVG} width={16} height={16}><path d="m5 12 5 5 9-10" /></svg>{pending ? t("שומר…") : t("בוצע")}</span>
                <span className="max-sm:hidden">{pending ? t("שומר…") : t("סימון כבוצע")}</span>
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
