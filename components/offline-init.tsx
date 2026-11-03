"use client";

import { useEffect } from "react";
import { flushQueue } from "@/lib/offline/queue";
import { useT } from "@/components/i18n-provider";
import { toast } from "@/components/toast";

// Registers the offline service worker once, and tries to replay any queued actions whenever the
// browser comes back online (and once on load, in case the tab was reopened after reconnecting).
export function OfflineInit() {
  const t = useT();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onFailed = () => toast(t("פעולה שנשמרה במכשיר לא הצליחה להסתנכרן — ככל הנראה המשימה כבר טופלה. בדוק/י בכרטיס המטופל."));
    const flush = () => { flushQueue(onFailed); };
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
