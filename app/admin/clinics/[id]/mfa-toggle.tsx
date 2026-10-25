"use client";

import { useState, useTransition } from "react";
import { setClinicMfa } from "../../actions";

export function MfaToggle({ clinicId, initial }: { clinicId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    if (!next && !confirm("לכבות אימות דו-שלבי עבור המרפאה?")) return;
    setError(null);
    setOn(next);
    start(async () => {
      const res = await setClinicMfa(clinicId, next);
      if (res.error) { setOn(!next); setError(res.error); }
    });
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">אימות דו-שלבי לצוות</p>
          <p className="mt-0.5 text-sm text-muted">
            כשהוא פעיל, רופאים ואנשי צוות של המרפאה מזינים גם קוד מאפליקציית אימות בכל כניסה. מטופלים ובני משפחה לא מושפעים.
          </p>
        </div>
        <button
          type="button" role="switch" aria-checked={on} aria-label="אימות דו-שלבי" disabled={pending} onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${on ? "border-accent bg-accent" : "border-line-strong bg-paper"}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "start-6" : "start-0.5"}`} />
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
