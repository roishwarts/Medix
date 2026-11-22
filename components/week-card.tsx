"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";

export type WeekSurgery = { id: string; date: string; name: string; detail: string; ready: boolean };

const DAY = 86400000;
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);

function Chevron({ dir }: { dir: "prev" | "next" }) {
  // "previous" points to where reading starts (right in Hebrew/Arabic, left in English/Russian); "next" the other way.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={dir === "prev" ? "-scale-x-100 ltr:scale-x-100" : "ltr:-scale-x-100"}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

// The "this week at the clinic" card: a Sunday-to-Saturday strip with arrows to move between weeks. The days that
// have a surgery are filled; today is outlined. Only the surgeries of the week on show are listed under the strip.
export function WeekCard({ today, surgeries, locale }: { today: string; surgeries: WeekSurgery[]; locale: string }) {
  const t = useT();
  const [offset, setOffset] = useState(0);
  const todayD = noon(today);
  const start = new Date(todayD.getTime() - todayD.getUTCDay() * DAY + offset * 7 * DAY);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime() + i * DAY);
    const iso = d.toISOString().slice(0, 10);
    return { iso, d, day: d.getUTCDate(), label: d.toLocaleDateString(locale, { weekday: "narrow", timeZone: "UTC" }) };
  });
  const inWeek = surgeries.filter((s) => s.date >= days[0].iso && s.date <= days[6].iso).sort((a, b) => (a.date < b.date ? -1 : 1));
  const surgeryDays = new Set(inWeek.map((s) => s.date));
  const fmt = (d: Date) => d.toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const arrow = "btn btn-quiet btn-icon size-10";

  return (
    <div className="px-4 pb-4 md:px-5 md:pb-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" className={arrow} aria-label={t("השבוע הקודם")} onClick={() => setOffset((o) => o - 1)}><Chevron dir="prev" /></button>
        <div className="flex min-w-0 flex-col items-center">
          <span className="num text-sm font-medium" aria-live="polite">{fmt(days[0].d)} – {fmt(days[6].d)}</span>
          {offset !== 0 && <button type="button" className="text-xs text-accent underline-offset-4 hover:underline" onClick={() => setOffset(0)}>{t("חזרה לשבוע הנוכחי")}</button>}
        </div>
        <button type="button" className={arrow} aria-label={t("השבוע הבא")} onClick={() => setOffset((o) => o + 1)}><Chevron dir="next" /></button>
      </div>
      <ol className="grid grid-cols-7 gap-1.5 text-center" aria-hidden="true">
        {days.map((d) => {
          const hasSurgery = surgeryDays.has(d.iso);
          const isToday = d.iso === today;
          return (
            <li key={d.iso} className="min-w-0">
              <span className="block text-xs text-muted">{d.label}</span>
              <span className={`num mt-1 grid h-11 place-items-center rounded-2xl text-sm font-medium ${hasSurgery ? "bg-accent text-white" : "bg-[var(--hover-tint)]"} ${isToday ? "ring-2 ring-accent/45 ring-offset-1 ring-offset-transparent" : ""}`}>{d.day}</span>
            </li>
          );
        })}
      </ol>
      {inWeek.length === 0 ? (
        <p className="mt-4 px-2 py-3 text-center text-sm text-muted">{t("אין ניתוחים בשבוע הזה")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {inWeek.map((j) => {
            const dt = noon(j.date);
            const upcoming = j.date >= today;
            return (
              <li key={j.id}>
                <Link href={`/clinic/patients/${j.id}`} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/45 px-3 py-2.5 transition hover:bg-white/70">
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-center leading-tight text-white">
                    <span><span className="num block text-base font-semibold">{dt.getUTCDate()}</span><span className="block text-[11px]">{dt.toLocaleDateString(locale, { month: "short", timeZone: "UTC" })}</span></span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-semibold">{j.name}</span>
                    <span className="block break-words text-sm text-muted">{j.detail}</span>
                  </span>
                  {upcoming && <span className={`pill shrink-0 ${j.ready ? "pill-ok" : "pill-bad"}`}>{j.ready ? t("מוכן") : t("לא מוכן")}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
