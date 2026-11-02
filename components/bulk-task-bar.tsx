"use client";

import { useEffect, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { queueOrRun } from "@/lib/offline/queue";
import { toast } from "@/components/toast";
import { Icon } from "@/components/ui";
import {
  clearSelection,
  selectedTaskIds,
  selectionSize,
  setBulkPending,
  subscribeSelection,
} from "@/lib/task-selection";

// A sticky bar that appears once at least one task is checked on the queue, so staff can accept
// several at once instead of one row at a time. Runs each through the same accept path (and
// offline queue) as a single row's own button, just looped — reject/reopen aren't offered here on
// purpose, same reasoning as the per-row button.
export function BulkTaskBar() {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const count = useSyncExternalStore(subscribeSelection, selectionSize, () => 0);

  // Leaving the page (or returning to it fresh) shouldn't carry over a stale selection.
  useEffect(() => clearSelection, []);

  if (count === 0) return null;

  function acceptSelected() {
    setBulkPending(true);
    start(async () => {
      const ids = selectedTaskIds();
      let failed = 0;
      for (const taskId of ids) {
        const result = await queueOrRun({ kind: "staff_accept", taskId });
        if (result.rejected) failed++;
      }
      setBulkPending(false);
      clearSelection();
      if (failed > 0) {
        toast(t("{failed} מתוך {total} לא הצליחו להתאשר — ייתכן שטופלו כבר אחרת.", { failed, total: ids.length }));
      } else {
        toast(ids.length === 1 ? t("משימה אחת אושרה.") : t("{n} משימות אושרו.", { n: ids.length }));
      }
      router.refresh();
    });
  }

  // Sits above the toast (bottom-20/bottom-6), so a sync toast during a bulk accept doesn't overlap it.
  return (
    <div className="fixed inset-x-4 bottom-36 z-[70] mx-auto max-w-lg md:bottom-20" role="status">
      <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-lg">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon name="check" size={16} />
          {count === 1 ? t("משימה אחת נבחרה") : t("{n} משימות נבחרו", { n: count })}
        </span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => clearSelection()}>
            {t("ביטול")}
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={acceptSelected}>
            {pending ? t("מאשר…") : t("אישור הנבחרות")}
          </button>
        </div>
      </div>
    </div>
  );
}
