"use client";

import { useT } from "@/components/i18n-provider";
import { useId, useState, useTransition } from "react";
import { setClinicFeature } from "../../actions";

// An on/off switch for one feature of the clinic (the questionnaires, the urgent-call red flags).
export function FeatureToggle({ clinicId, feature, initial, title, description }: {
  clinicId: string; feature: "proms" | "red_flags"; initial: boolean; title: string; description: string;
}) {
  const t = useT();
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const descId = useId();

  function toggle() {
    const next = !on;
    if (!next && !confirm(t("להסתיר את התכונה הזו מהמטופלים והצוות של המרפאה? המידע השמור נשאר."))) return;
    setError(null);
    setOn(next);
    start(async () => {
      const res = await setClinicFeature(clinicId, feature, next);
      if (res.error) { setOn(!next); setError(res.error); }
    });
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          <p id={descId} className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span aria-hidden="true" className={`text-sm font-medium ${on ? "text-ok" : "text-muted"}`}>{on ? t("פעיל") : t("כבוי")}</span>
          <button
            type="button" role="switch" aria-checked={on} aria-label={title} aria-describedby={descId} disabled={pending} onClick={toggle}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus-visible:!rounded-full disabled:opacity-60 after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] ${on ? "border-accent bg-accent" : "border-line-strong bg-paper"}`}
          >
            <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "start-6" : "start-0.5"}`} />
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
    </div>
  );
}
