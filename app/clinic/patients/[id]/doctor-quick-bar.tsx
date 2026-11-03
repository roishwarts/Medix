"use client";

import Link from "next/link";
import { useT } from "@/components/i18n-provider";

export const NEW_SUMMARY_EVENT = "medix:new-summary";

const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);

// The doctor's most common actions on a patient, as big buttons at the bottom of the phone screen
// (right above the main navigation bar), so everything is reachable with one thumb.
export function DoctorQuickBar({ patientId, phone, openQuestions }: { patientId: string; phone: string; openQuestions: number }) {
  const t = useT();
  const item = "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.6875rem] leading-tight text-ink active:bg-accent-soft";

  function newSummary() {
    window.dispatchEvent(new Event(NEW_SUMMARY_EVENT));
  }

  return (
    <nav
      aria-label={t("פעולות מהירות")}
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface shadow-[0_-2px_8px_rgba(0,0,0,0.06)] md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch divide-x divide-line rtl:divide-x-reverse">
        {phone ? (
          <a href={`tel:${phone}`} className={item}>
            <Svg><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></Svg>
            <span className="max-w-full truncate">{t("התקשרות")}</span>
          </a>
        ) : (
          <span className={`${item} opacity-40`} aria-disabled="true">
            <Svg><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></Svg>
            <span className="max-w-full truncate">{t("התקשרות")}</span>
          </span>
        )}
        <button type="button" className={item} onClick={newSummary}>
          <Svg><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" /></Svg>
          <span className="max-w-full truncate">{t("סיכום פגישה")}</span>
        </button>
        <Link href={`/clinic/patients/${patientId}/referrals/new`} className={item}>
          <Svg><path d="M4 12h13M13 6l6 6-6 6" /></Svg>
          <span className="max-w-full truncate">{t("הפניה")}</span>
        </Link>
        <a href="#doctor-questions" className={item}>
          <span className="relative">
            <Svg><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /></Svg>
            {openQuestions > 0 && (
              <span className="num absolute -end-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[0.625rem] font-medium leading-4 text-white">{openQuestions}</span>
            )}
          </span>
          <span className="max-w-full truncate">{t("שאלות")}</span>
        </a>
      </div>
    </nav>
  );
}
