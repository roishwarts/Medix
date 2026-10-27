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
        className="link-row block w-full px-4 py-3 text-start disabled:opacity-60"
        onClick={() => { setError(null); start(async () => { const res = await startViewAs(id); if (res?.error) setError(res.error); }); }}
      >
        {children}
        {pending && <span className="mt-1 block text-xs text-muted">פותח…</span>}
      </button>
      {error && <p role="alert" className="px-4 pb-3 text-sm text-bad">{error}</p>}
    </li>
  );
}
