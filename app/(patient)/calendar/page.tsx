import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { patientEvents } from "@/lib/calendar";
import { today, relativeDays, formatDateLong, addMonths, monthTitle, startOfWeek, addDays, weekday, weekdayNames } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import type { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/prefs-server";
import { parseCalParams } from "@/components/calendar";
import { byDate, type CalEvent } from "@/lib/calendar";
import { AddEventButton } from "@/components/add-event-button";
import { LOCALE } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT())("היומן שלך") };
}

const CELL: Record<string, string> = {
  surgery: "bg-[#f7a801] font-bold text-[#171e29]",
  appointment: "bg-[#e3f1f4] font-semibold text-[#17606f]",
  deadline: "bg-[#fff3dc] font-semibold text-[#8a5300]",
};
const PRIORITY = ["surgery", "appointment", "deadline"];

// One month, all on one screen: a day with something on it is tinted by what it is (surgery, appointment, deadline).
function Month({ d, t0, events, lang, t, hrefFor }: { d: string; t0: string; events: CalEvent[]; lang: "he" | "en" | "ru" | "ar"; t: ReturnType<typeof makeT>; hrefFor: (d: string) => string }) {
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
        <Link href={hrefFor(addMonths(d, -1))} aria-label={t("חודש קודם")} className="btn btn-sm btn-icon size-11 min-h-11 sm:size-9 sm:min-h-9 [&_svg]:rotate-0"><span aria-hidden>›</span></Link>
        <h2 className="display text-base font-semibold sm:text-lg">{monthTitle(d, lang)}</h2>
        <Link href={hrefFor(addMonths(d, 1))} aria-label={t("חודש הבא")} className="btn btn-sm btn-icon size-11 min-h-11 sm:size-9 sm:min-h-9"><span aria-hidden>‹</span></Link>
      </div>
      <div role="grid" aria-label={monthTitle(d, lang)} className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
        {names.map((n, i) => <span key={i} className="py-1 text-xs text-muted">{n}</span>)}
        {cells.map((day) => {
          const list = map.get(day) ?? [];
          const kind = PRIORITY.find((k) => list.some((e) => e.kind === k));
          const inMonth = day.startsWith(month);
          const first = list.find((e) => e.kind === kind);
          const cls = `num grid aspect-square place-items-center rounded-xl text-sm sm:aspect-[2/1] ${kind ? CELL[kind] : inMonth ? "" : "text-line-strong"} ${day === t0 ? "ring-2 ring-accent ring-offset-1" : ""}`;
          const label = list.length ? `${formatDateLong(day, lang)}: ${list.map((e) => e.title).join(", ")}` : undefined;
          return first ? (
            <Link key={day} href={first.href} aria-label={label} className={`${cls} hover:brightness-95`}>{+day.slice(8)}</Link>
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

export default async function PatientCalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; d?: string }> }) {
  const { d } = parseCalParams(await searchParams);
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const journeys = await loadJourneys();
  if (journeys.length === 0)
    return (
      <main className="py-20 text-center">
        <h1 className="display mb-2 text-3xl">{t("היומן שלך")}</h1>
        <p className="text-muted" role="status">{t("עדיין לא הוגדר עבורך מסלול. פנה/י למרפאה.")}</p>
      </main>
    );
  // More than one journey (another surgery, past or planned) shows on the same calendar.
  const events = journeys.flatMap((j) => patientEvents(j, t));
  const t0 = today();
  const sorted = (list: CalEvent[]) => [...list].sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  const next = sorted(events.filter((e) => e.kind !== "deadline" && e.date >= t0))[0];
  // The next few things on the calendar: the surgery, appointments and the deadlines that are still open.
  const upcoming = sorted(events.filter((e) => e.date >= t0 && (e.kind !== "deadline" || e.tone !== "ok"))).slice(0, 5);
  const hrefFor = (day: string) => `/calendar?d=${day}`;
  return (
    <main>
      <h1 className="display text-3xl">{t("היומן שלך")}</h1>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-8">
        <div className="card border-[#9ccbd6] px-[18px] py-4 lg:col-start-2 lg:row-start-1">
          <p className="text-sm font-semibold text-accent">{t("הבא בתור")}</p>
          {next ? (
            <>
              <Link href={next.href} className="mt-0.5 block text-[17px] font-medium">{next.title}</Link>
              <p className="text-sm text-muted">
                {formatDateLong(next.date, lang)}
                {next.time ? <> · {t("בשעה")} <span className="num" dir="ltr">{next.time}</span></> : null} ({relativeDays(next.date, t0, lang)})
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-muted">{t("אין כרגע ניתוח או תורים קרובים ביומן.")}</p>
          )}
        </div>

        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Month d={d} t0={t0} events={events} lang={lang} t={t} hrefFor={hrefFor} />
        </div>

        {upcoming.length > 0 && (
          <section aria-labelledby="h-soon" className="lg:col-start-2 lg:row-start-2">
            <h2 id="h-soon" className="eyebrow mb-2">{t("בקרוב")}</h2>
            <ul className="card divide-y divide-line">
              {upcoming.map((e) => {
                const box = e.kind === "surgery" ? "bg-[#f7a801] text-[#171e29]" : e.kind === "appointment" ? "bg-[#e3f1f4] text-[#17606f]" : "bg-[#fff3dc] text-[#8a5300]";
                const day = e.date.slice(8, 10).replace(/^0/, "");
                const month = new Date(`${e.date}T12:00:00`).toLocaleDateString(LOCALE[lang], { month: "short" });
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`grid size-12 shrink-0 place-items-center rounded-xl text-center leading-tight ${box}`} aria-hidden="true">
                      <span><span className="num block text-base font-semibold">{day}</span><span className="block text-[11px]">{month}</span></span>
                    </span>
                    <Link href={e.href} className="min-w-0 flex-1 break-words">
                      <span className="block font-medium">{e.title}</span>
                      <span className="block text-sm text-muted">
                        {e.kind === "deadline" ? t("מועד יעד") : e.time ? <span className="num" dir="ltr">{e.time}</span> : formatDateLong(e.date, lang)}
                        {e.sub ? <> · {e.sub}</> : null}
                      </span>
                    </Link>
                    <AddEventButton id={e.id} event={{ title: e.title, date: e.date, time: e.time, location: e.sub ?? null }} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
