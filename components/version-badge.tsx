"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";

const POLL_MS = 20_000;
const AUTO_RELOAD_AFTER_MS = 8_000;
const CURRENT_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev";

function isTyping() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

// A small, unobtrusive corner badge: shows the build currently running in this tab,
// and lets you jump to the latest one manually or (when nobody's mid-form) automatically.
export function VersionBadge() {
  const t = useT();
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const dismissed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.version && data.version !== CURRENT_VERSION) setNewVersion(data.version);
      } catch {
        // offline or the deployment is mid-swap — just try again next tick
      }
    };
    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!newVersion || dismissed.current) return;
    if (isTyping()) return; // don't yank the page from under someone filling a form
    setCountdown(Math.round(AUTO_RELOAD_AFTER_MS / 1000));
    const start = Date.now();
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((AUTO_RELOAD_AFTER_MS - (Date.now() - start)) / 1000));
      setCountdown(left);
      if (left === 0) {
        clearInterval(id);
        location.reload();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [newVersion]);

  if (newVersion) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-3 bottom-20 z-50 md:bottom-3 flex items-center justify-between gap-3 rounded-2xl border border-accent-line bg-surface px-4 py-2.5 text-sm shadow-lg sm:inset-x-auto sm:start-3"
      >
        <span>
          {t("גרסה חדשה פורסמה")}{countdown !== null && countdown > 0 ? ` · ${t("מרענן בעוד {n}", { n: countdown })}` : ""}
        </span>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn btn-sm btn-primary min-h-9" onClick={() => location.reload()}>
            {t("רענון עכשיו")}
          </button>
          <button
            type="button"
            aria-label={t("התעלמות מהעדכון")}
            className="btn btn-sm btn-quiet min-h-9"
            onClick={() => {
              dismissed.current = true;
              setCountdown(null);
              setNewVersion(null);
            }}
          >
            {t("לא עכשיו")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => location.reload()}
      title={t("רענון")}
      aria-label={t("גרסה נוכחית: {v}. לחיצה לרענון", { v: CURRENT_VERSION })}
      className="fixed bottom-20 start-2 z-40 md:bottom-2 flex items-center gap-1 rounded-full bg-ink/5 px-2 py-1 text-xs text-muted opacity-60 transition hover:opacity-100 hover:bg-ink/10"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 3v6h-6" />
      </svg>
      <span dir="ltr" className="num">{CURRENT_VERSION}</span>
    </button>
  );
}
