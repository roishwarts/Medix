"use client";

import { useEffect, useRef, useState } from "react";

// While an admin views the system as someone else, every write is refused by the server (see proxy.ts).
// This listens for those refusals and explains them in a popup instead of leaving a silent failure.
export function ViewAsGuard() {
  const [open, setOpen] = useState(false);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const res = await original(...args);
      if (res.headers.get("x-view-as-blocked")) setOpen(true);
      return res;
    };
    return () => { window.fetch = original; };
  }, []);

  useEffect(() => {
    if (open) okRef.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 px-6 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        role="alertdialog" aria-modal="true" aria-labelledby="view-as-title"
        className="card w-full max-w-sm p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
      >
        <h2 id="view-as-title" className="display text-xl">מצב צפייה בלבד</h2>
        <p className="mt-2 text-muted">אתה במצב צפייה כמנהל, ולכן אי אפשר לערוך פרטים.</p>
        <button ref={okRef} className="btn btn-primary mt-5 w-full" onClick={() => setOpen(false)}>הבנתי</button>
      </div>
    </div>
  );
}
