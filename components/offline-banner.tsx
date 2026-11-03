"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { onQueueChange, pendingCount } from "@/lib/offline/queue";
import { Icon } from "@/components/ui";

export function OfflineBanner() {
  const t = useT();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const refresh = () => pendingCount().then(setPending);
    refresh();
    const unsubscribe = onQueueChange(refresh);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      unsubscribe();
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div className={`flex min-h-10 items-center justify-center gap-2 px-4 py-1.5 text-center text-sm ${online ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}`} role="status">
      <Icon name="alert" size={14} />
      {!online && <span>{t("אין חיבור לאינטרנט — פעולות מסוימות יישמרו וישלחו כשהחיבור יחזור")}</span>}
      {online && pending > 0 && (
        <span>{pending === 1 ? t("פעולה אחת ממתינה לסנכרון…") : t("{n} פעולות ממתינות לסנכרון…", { n: pending })}</span>
      )}
    </div>
  );
}
