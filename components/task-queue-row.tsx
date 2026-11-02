"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { queueOrRun } from "@/lib/offline/queue";
import { toast } from "@/components/toast";
import { deselectTask, isBulkPending, isTaskSelected, subscribeSelection, toggleTaskSelected } from "@/lib/task-selection";
import type { ActionKind, Owner } from "@/lib/journey";

// Lets staff accept a task right from the "all tasks" queue instead of opening the patient's card
// first — same accept logic (and same offline-safe queue) as task-review.tsx, just reachable
// without the extra navigation. Reject/reopen still require the patient card: those need a note
// and carry real conflict risk, so they stay a deliberate, slower action.
export function TaskQueueRow({
  taskId,
  href,
  kind,
  owner,
  reminder,
  children,
}: {
  taskId: string;
  href: string;
  kind: ActionKind;
  owner: Owner;
  reminder?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = useSyncExternalStore(subscribeSelection, () => isTaskSelected(taskId), () => false);
  const bulkPending = useSyncExternalStore(subscribeSelection, isBulkPending, () => false);

  if (done) return null;

  const label = kind === "review" ? t("אישור") : owner === "patient" ? t("סימון כהושלם ידנית") : t("סימון כבוצע");

  function accept(e: React.MouseEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await queueOrRun({ kind: "staff_accept", taskId });
      if (result.rejected) {
        setError(t("הפעולה נכשלה. ייתכן שהמשימה כבר טופלה אחרת — רענן/י ונסה/י שוב."));
        return;
      }
      if (result.queued) toast(t("אין חיבור לרגע — השמירה בוצעה במכשיר ותישלח אוטומטית כשהחיבור יחזור."));
      deselectTask(taskId);
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div className={`flex flex-wrap items-stretch gap-2 ${selected && bulkPending ? "opacity-50" : ""}`}>
      <label className="flex items-center ps-3">
        <span className="sr-only">{t("בחירת המשימה לאישור קבוצתי")}</span>
        <input
          type="checkbox"
          className="size-5"
          checked={selected}
          disabled={bulkPending}
          onChange={() => toggleTaskSelected(taskId)}
        />
      </label>
      <Link href={href} className="min-w-0 flex-1 px-2 py-2.5 link-row">
        {children}
      </Link>
      <div className="flex items-center gap-2 pe-3">
        {reminder}
        <button
          type="button"
          onClick={accept}
          disabled={pending || bulkPending}
          className={kind === "review" ? "btn btn-primary btn-sm" : "btn btn-sm"}
        >
          {pending ? t("שומר…") : label}
        </button>
      </div>
      {error && <p role="alert" className="w-full px-4 pb-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
