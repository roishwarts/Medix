"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markOnboarded } from "./actions";

const STEPS = [
  {
    title: "ברוכים הבאים",
    body: "כאן תמצאו את כל ההכנה לניתוח שלכם במקום אחד: מה צריך להכין, עד מתי, ומה כבר בוצע.",
  },
  {
    title: "נדע להזכיר לכם",
    body: "כל משימה מגיעה בזמן הנכון. מעלים מסמך, מסמנים שבוצע — והצוות יעדכן אתכם ברגע שהוא אישר.",
  },
  {
    title: "לא לבד בתהליך",
    body: "יש לכם צוות מטפל זמין בכל שלב, ואפשר לשתף את המסלול עם בן משפחה שילווה אתכם.",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const last = step === STEPS.length - 1;

  function finish() {
    start(async () => {
      await markOnboarded();
      router.push("/journey");
    });
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex justify-end">
        <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={finish}>
          דילוג
        </button>
      </div>

      <div className="min-h-40 py-4">
        <h1 className="display text-3xl">{STEPS[step].title}</h1>
        <p className="mt-3 max-w-prose text-lg leading-relaxed text-muted">{STEPS[step].body}</p>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5" role="img" aria-label={`שלב ${step + 1} מתוך ${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <span key={i} className={`size-1.5 rounded-full ${i === step ? "bg-accent" : "bg-line-strong"}`} />
        ))}
      </div>

      <button
        type="button"
        className="btn btn-primary mt-6 w-full"
        disabled={pending}
        onClick={() => (last ? finish() : setStep((s) => s + 1))}
      >
        {pending ? "רק רגע…" : last ? "בואו נתחיל" : "הבא"}
      </button>
    </div>
  );
}
