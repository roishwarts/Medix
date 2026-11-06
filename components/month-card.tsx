import Link from "next/link";
import { byDate, type CalEvent } from "@/lib/calendar";
import { addDays, addMonths, formatDateLong, LOCALE, monthTitle, startOfWeek, weekday, weekdayNames } from "@/lib/dates";
import { AddEventButton } from "@/components/add-event-button";
import type { T } from "@/lib/i18n";
import type { Lang } from "@/lib/prefs";

const CELL: Record<string, string> = {
  surgery: "bg-[#f7a801] font-bold text-[#171e29]",
  appointment: "bg-[#e3f1f4] font-semibold text-[#17606f]",
  deadline: "bg-[#fff3dc] font-semibold text-[#8a5300]",
};
const PRIORITY = ["surgery", "appointment", "deadline"];

// One month, all on one screen: a day with something on it is tinted by what it is (surgery, appointment, deadline).
// `dayHref` says where a day with events leads (the item itself, or the day's list).
export function MonthCard({
  d, t0, events, lang, t, navHref, dayHref,
}: {
  d: string; t0: string; events: CalEvent[]; lang: Lang; t: T;
  navHref: (day: string) => string;
  dayHref: (day: string, list: CalEvent[]) => string;
}) {
  const map = byDate(events);
  const month = d.slice(0, 7);
  const first = `${month}-01`;
  const start = startOfWeek(first);
  const daysInMonth = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
  const weeks = Math.ceil((weekday(first) + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const names = weekdayNames(lang);
  return (
    <div className="card p-3.5 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <Link href={navHref(addMonths(d, -1))} aria-label={t("חודש קודם")} className="btn btn-sm btn-icon size-11 min-h-11 sm:size-9 sm:min-h-9"><span aria-hidden>›</span></Link>
        <h2 className="display text-base font-semibold sm:text-lg">{monthTitle(d, lang)}</h2>
        <Link href={navHref(addMonths(d, 1))} aria-label={t("חודש הבא")} className="btn btn-sm btn-icon size-11 min-h-11 sm:size-9 sm:min-h-9"><span aria-hidden>‹</span></Link>
      </div>
      <div role="grid" aria-label={monthTitle(d, lang)} className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
        {names.map((n, i) => <span key={i} className="py-1 text-xs text-muted">{n}</span>)}
        {cells.map((day) => {
          const list = map.get(day) ?? [];
          const kind = PRIORITY.find((k) => list.some((e) => e.kind === k));
          const inMonth = day.startsWith(month);
          const cls = `num grid aspect-square place-items-center rounded-xl text-sm sm:aspect-[2/1] ${kind ? CELL[kind] : inMonth ? "" : "text-line-strong"} ${day === t0 ? "ring-2 ring-accent ring-offset-1" : ""}`;
          const label = list.length ? `${formatDateLong(day, lang)}: ${list.map((e) => e.title).join(", ")}` : undefined;
          return list.length ? (
            <Link key={day} href={dayHref(day, list)} aria-label={label} className={`${cls} hover:brightness-95`}>{+day.slice(8)}</Link>
          ) : (
            <span key={day} className={cls}>{+day.slice(8)}</span>
          );
        })}
      </div>
      <ul className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" aria-label={t("מקרא צבעים")}>
        <li className="flex items-center gap-1.5"><i aria-hidden className="size-2.5 rounded-[3px] bg-[#f7a801]" />{t("יום הניתוח")}</li>
        <li className="flex items-center gap-1.5"><i aria-hidden className="size-2.5 rounded-[3px] border border-[#9ccbd6] bg-[#e3f1f4]" />{t("תור")}</li>
        <li className="flex items-center gap-1.5"><i aria-hidden className="size-2.5 rounded-[3px] border border-[#e8c98a] bg-[#fff3dc]" />{t("מועד יעד")}</li>
      </ul>
    </div>
  );
}

// "Coming up": date chip, what it is, and an icon that adds it to a calendar.
export function UpcomingList({ events, lang, t, googleOnly, showPatient }: { events: CalEvent[]; lang: Lang; t: T; googleOnly?: boolean; showPatient?: boolean }) {
  return (
    <ul className="card divide-y divide-line">
      {events.map((e) => {
        const box = e.kind === "surgery" ? "bg-[#f7a801] text-[#171e29]" : e.kind === "appointment" ? "bg-[#e3f1f4] text-[#17606f]" : "bg-[#fff3dc] text-[#8a5300]";
        const day = e.date.slice(8, 10).replace(/^0/, "");
        const month = new Date(`${e.date}T12:00:00`).toLocaleDateString(LOCALE[lang], { month: "short" });
        return (
          <li key={e.id + e.kind} className="flex items-center gap-3 px-4 py-3">
            <span className={`grid size-12 shrink-0 place-items-center rounded-xl text-center leading-tight ${box}`} aria-hidden="true">
              <span><span className="num block text-base font-semibold">{day}</span><span className="block text-[11px]">{month}</span></span>
            </span>
            <Link href={e.href} className="min-w-0 flex-1 break-words">
              <span className="block font-medium">{e.title}</span>
              <span className="block text-sm text-muted">
                {showPatient && e.patient && e.kind !== "surgery" ? `${e.patient} · ` : ""}
                {e.kind === "deadline" ? t("מועד יעד") : e.time ? <span className="num" dir="ltr">{e.time}</span> : formatDateLong(e.date, lang)}
                {e.sub ? <> · {e.sub}</> : null}
              </span>
            </Link>
            <AddEventButton id={e.id} googleOnly={googleOnly} event={{ title: e.patient && e.kind !== "surgery" ? `${e.title} – ${e.patient}` : e.title, date: e.date, time: e.time, location: e.kind === "surgery" ? null : e.sub ?? null }} />
          </li>
        );
      })}
    </ul>
  );
}
