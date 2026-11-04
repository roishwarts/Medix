"use client";

import { useT } from "@/components/i18n-provider";
import { useEffect, useRef, useState, useTransition } from "react";
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
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const last = step === STEPS.length - 1;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function finish() {
    start(async () => {
      try {
        await markOnboarded();
      } catch {
        // Soft-fail on purpose (see actions.ts): a network hiccup here should never trap a
        // brand-new patient on the wizard — they'll just see onboarding again next login.
      }
      router.push("/journey");
    });
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex justify-end">
        <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={finish}>
          {t("דילוג")}
        </button>
      </div>

      <div className="min-h-40 py-4">
        <h1 ref={headingRef} tabIndex={-1} className="display text-3xl outline-none">{t(STEPS[step].title)}</h1>
        <p className="mt-3 max-w-prose text-lg leading-relaxed text-muted">{t(STEPS[step].body)}</p>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {t("שלב {n} מתוך {total}", { n: step + 1, total: STEPS.length })}
      </p>
      <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span key={i} className={`size-1.5 rounded-full ${i === step ? "bg-accent" : "bg-line-strong"}`} />
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            className="btn btn-quiet"
            disabled={pending}
            onClick={() => setStep((s) => s - 1)}
          >
            {t("הקודם")}
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={pending}
          onClick={() => (last ? finish() : setStep((s) => s + 1))}
        >
          {pending ? t("רק רגע…") : last ? t("בואו נתחיל") : t("הבא")}
        </button>
      </div>
    </div>
  );
}
