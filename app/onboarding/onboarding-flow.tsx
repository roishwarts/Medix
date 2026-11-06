"use client";

import { useT } from "@/components/i18n-provider";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markOnboarded, recordPrivacyConsent } from "./actions";

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

export function OnboardingFlow({ skipIntro, needsConsent }: { skipIntro: boolean; needsConsent: boolean }) {
  const t = useT();
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "consent">(skipIntro && needsConsent ? "consent" : "intro");
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const last = step === STEPS.length - 1;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, phase]);

  function finish() {
    setError(null);
    start(async () => {
      if (needsConsent) {
        const result = await recordPrivacyConsent();
        if (result.error) { setError(result.error); return; }
      }
      try {
        await markOnboarded();
      } catch {
        // Soft-fail on purpose (see actions.ts): a network hiccup here should never trap a
        // brand-new patient on the wizard — they'll just see onboarding again next login.
      }
      router.push("/journey");
    });
  }

  function afterIntro() {
    if (needsConsent) setPhase("consent");
    else finish();
  }

  if (phase === "consent") {
    return (
      <div className="card p-6 sm:p-8">
        <h1 ref={headingRef} tabIndex={-1} className="display text-3xl outline-none">{t("לפני שממשיכים")}</h1>
        <p className="mt-3 max-w-prose text-muted">
          {t("השימוש באפליקציה כולל שמירה ועיבוד של מידע רפואי ואישי שלך, כדי לנהל את מסלול הטיפול. אפשר לקרוא איך בדיוק זה נעשה במדיניות הפרטיות שלנו.")}
        </p>

        <label className="mt-6 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-white/50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-accent"
          />
          <span>
            {t("קראתי ואני מאשר/ת את ")}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-ink">
              {t("מדיניות הפרטיות")}
            </a>
          </span>
        </label>

        <div role="alert" aria-live="assertive">
          {error && (
            <p className="mt-3 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>
          )}
        </div>

        <button type="button" className="btn btn-primary mt-6 w-full" disabled={!agreed || pending} onClick={finish}>
          {pending ? t("רק רגע…") : t("אישור והתחלה")}
        </button>
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex justify-end">
        <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={afterIntro}>
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
          onClick={() => (last ? afterIntro() : setStep((s) => s + 1))}
        >
          {pending ? t("רק רגע…") : last ? t("בואו נתחיל") : t("הבא")}
        </button>
      </div>
    </div>
  );
}
