"use client";

import { useT } from "@/components/i18n-provider";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui";
import { startViewAs } from "./actions";

// A user row that opens the system as that user (read-only, logged) when tapped.
export function ViewAsRow({ id, name, children }: { id: string; name: string; children: React.ReactNode }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function open() {
    setError(null);
    start(async () => {
      const res = await startViewAs(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <li>
      <button
        type="button" disabled={pending} aria-label={t("פתיחת המערכת בעיני {name}", { name })}
        title={t("הפעולה נשמרת ביומן הביקורת")}
        className="link-row flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        onClick={open}
      >
        {children}
        {pending ? (
          <span role="status" className="shrink-0 text-xs text-muted">{t("פותח…")}</span>
        ) : (
          <span className="shrink-0 text-muted">
            <Icon name="arrow" size={18} />
          </span>
        )}
      </button>
      {error && <p role="alert" aria-live="assertive" className="px-4 pb-3 text-sm text-bad">{error}</p>}
    </li>
  );
}
