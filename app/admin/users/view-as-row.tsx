"use client";

import { useState, useTransition } from "react";
import { startViewAs } from "./actions";

// A user row that opens the system as that user (read-only) when tapped.
export function ViewAsRow({ id, name, children }: { id: string; name: string; children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <li>
      <button
        type="button" disabled={pending} aria-label={`צפייה במערכת כ${name}`}
        className="link-row flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        onClick={() => { setError(null); start(async () => { const res = await startViewAs(id); if (res?.error) setError(res.error); }); }}
      >
        {children}
        {pending ? (
          <span role="status" className="shrink-0 text-xs text-muted">פותח…</span>
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        )}
      </button>
      {error && <p role="alert" className="px-4 pb-3 text-sm text-bad">{error}</p>}
    </li>
  );
}
