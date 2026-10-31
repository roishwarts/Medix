import Link from "next/link";
import {
  addDays, addMonths, dayLabel, formatDate, monthTitle, relativeDays, startOfWeek, today as getToday, weekday,
  weekdayNames,
} from "@/lib/dates";
import { byDate, type CalEvent, type CalTone } from "@/lib/calendar";
import { Icon } from "@/components/ui";
import { makeT, type T } from "@/lib/i18n";
import type { Lang } from "@/lib/prefs";

export type CalView = "month" | "week" | "agenda";

const CHIP: Record<CalTone, string> = {
  info: "bg-accent-soft text-accent",
  ok: "bg-ok-soft text-ok",
  bad: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  neutral: "bg-paper text-ink ring-1 ring-inset ring-line",
  accent: "bg-accent text-surface",
};

const DOT: Record<CalTone, string> = {
  info: "bg-accent",
  ok: "bg-ok",
  bad: "bg-bad",
  warn: "bg-warn",
  neutral: "bg-line-strong",
  accent: "bg-accent",
};

const tasksLabel = (n: number, t: T) => (n === 1 ? t("משימה אחת") : t("{n} משימות", { n }));
const eventsLabel = (n: number, t: T) => (n === 1 ? t("אירוע אחד") : t("{n} אירועים", { n }));

export function parseCalParams(sp: { view?: string; d?: string }) {
  const view: CalView = sp.view === "week" || sp.view === "agenda" ? sp.view : "month";
  const valid = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) && !Number.isNaN(Date.parse(sp.d));
  return { view, d: valid ? (sp.d as string) : getToday() };
}

function Chip({ e, compact }: { e: CalEvent; compact?: boolean }) {
  const isSurgery = e.kind === "surgery";
  return (
    <span className={`block truncate rounded-md px-1.5 py-0.5 text-xs leading-snug ${CHIP[e.tone]} ${isSurgery ? "font-semibold" : ""}`}>
      {e.time && <span className="num me-1 font-medium">{e.time}</span>}
      {compact && e.patient && !isSurgery ? `${e.patient} · ` : ""}
      {e.title}
    </span>
  );
}

function EventRow({ e, showPatient, t }: { e: CalEvent; showPatient?: boolean; t: T }) {
  const isSurgery = e.kind === "surgery";
  return (
    <Link href={e.href} className="link-row flex items-start gap-3 px-4 py-3">
      <span className="num w-12 shrink-0 pt-0.5 text-sm text-muted">{e.time ?? (isSurgery ? t("ניתוח") : "")}</span>
      <span className="min-w-0 flex-1">
        <span className={`block leading-snug ${isSurgery ? "font-semibold" : "font-medium"}`}>{e.title}</span>
        <span className="block text-sm text-muted">
          {showPatient && e.patient && !isSurgery ? `${e.patient}` : ""}
          {showPatient && e.patient && !isSurgery && e.sub ? " · " : ""}
          {e.sub}
        </span>
      </span>
      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[e.tone]} ${isSurgery ? "ring-2 ring-offset-1 ring-accent/40" : ""}`} />
    </Link>
  );
}

export function Calendar({
  events,
  view,
  d,
  basePath,
  query = {},
  showPatient,
  lang = "he",
}: {
  events: CalEvent[];
  view: CalView;
  d: string;
  basePath: string;
  query?: Record<string, string | undefined>;
  showPatient?: boolean;
  lang?: Lang;
}) {
  const t = makeT(lang);
  const t0 = getToday();
  const map = byDate(events);
  const href = (over: { view?: CalView; d?: string }) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) p.set(k, v);
    p.set("view", over.view ?? view);
    p.set("d", over.d ?? d);
    return `${basePath}?${p.toString()}`;
  };

  const step = view === "month" ? addMonths(d, 0) : d;
  const prev = view === "month" ? addMonths(step, -1) : addDays(d, view === "week" ? -7 : -30);
  const next = view === "month" ? addMonths(step, 1) : addDays(d, view === "week" ? 7 : 30);
  const title =
    view === "month"
      ? monthTitle(d, lang)
      : view === "week"
        ? `${formatDate(startOfWeek(d), lang)} – ${formatDate(addDays(startOfWeek(d), 6), lang)}`
        : t("מ־{date}", { date: formatDate(d, lang) });

  const names = weekdayNames(lang);
  const dayEvents = map.get(d) ?? [];

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <Link href={href({ d: prev })} aria-label={t("הקודם")} className="btn btn-icon size-11 min-h-11 [&_svg]:rotate-180"><Icon name="arrow" size={16} /></Link>
          <Link href={href({ d: t0 })} className="btn btn-sm max-sm:min-h-11">{t("היום")}</Link>
          <Link href={href({ d: next })} aria-label={t("הבא")} className="btn btn-icon size-11 min-h-11"><Icon name="arrow" size={16} /></Link>
          <h2 className="display ms-3 text-xl sm:text-2xl">{title}</h2>
        </div>
        <div role="group" aria-label={t("תצוגת היומן")} className="flex overflow-hidden rounded-full border border-line-strong text-sm">
          {([["month", t("חודש")], ["week", t("שבוע")], ["agenda", t("רשימה")]] as const).map(([v, label]) => (
            <Link key={v} href={href({ view: v })} aria-current={view === v ? "page" : undefined}
              className={`inline-flex min-h-11 items-center px-4 -outline-offset-2 sm:min-h-9 ${view === v ? "bg-accent text-white" : "hover:bg-paper"}`}>{label}</Link>
          ))}
        </div>
      </div>

      {view === "month" && (
        <MonthGrid d={d} t0={t0} map={map} names={names} href={href} lang={lang} t={t} />
      )}

      {view === "week" && (
        <div role="group" aria-label={t("השבוע")} className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(d), i)).map((day) => {
            const list = map.get(day) ?? [];
            return (
              <div key={day} className={`min-h-28 bg-surface p-2 sm:min-h-64 ${day === t0 ? "bg-accent-soft" : ""}`}>
                <p className="mb-2 text-xs text-muted">
                  <span className="font-medium text-ink">{names[weekday(day)]}</span> {formatDate(day, lang)}
                </p>
                <div className="space-y-1">
                  {list.map((e) => (
                    <Link key={e.id + e.kind} href={e.href} className="block rounded-md"><Chip e={e} compact={showPatient} /></Link>
                  ))}
                  {list.length === 0 && <span className="text-xs text-line-strong sm:hidden">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "agenda" && <Agenda map={map} from={d} showPatient={showPatient} t0={t0} lang={lang} t={t} />}

      {view !== "agenda" && (
        <section className="mt-6" aria-live="polite">
          <h3 className="eyebrow mb-2">
            {dayLabel(d, lang)} · {relativeDays(d, t0, lang)}
          </h3>
          {dayEvents.length === 0 ? (
            <p className="card px-4 py-6 text-center text-muted">{t("אין אירועים ביום הזה.")}</p>
          ) : (
            <div className="card divide-y divide-line">
              {dayEvents.map((e) => <EventRow key={e.id + e.kind} e={e} showPatient={showPatient} t={t} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function MonthGrid({
  d, t0, map, names, href, lang, t,
}: {
  lang: Lang; t: T;
  d: string; t0: string; map: Map<string, CalEvent[]>; names: string[];
  href: (o: { view?: CalView; d?: string }) => string;
}) {
  const first = d.slice(0, 7) + "-01";
  const gridStart = startOfWeek(first);
  const month = d.slice(0, 7);
  const weeks = Math.ceil((weekday(first) + new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  return (
    <div role="group" aria-label={t("החודש")} className="mt-5 overflow-hidden rounded-xl border border-line bg-line">
      <div className="grid grid-cols-7 gap-px">
        {names.map((n, i) => (
          <div key={i} className="bg-surface py-1.5 text-center text-xs font-medium text-muted">{n}</div>
        ))}
        {days.map((day) => {
          const list = map.get(day) ?? [];
          const inMonth = day.startsWith(month);
          const shown = list.filter((e) => e.kind !== "deadline").slice(0, 2);
          const deadlines = list.filter((e) => e.kind === "deadline");
          const hidden = list.length - shown.length;
          const hasSurgery = list.some((e) => e.kind === "surgery");
          const dayAriaLabel = list.length
            ? `${dayLabel(day, lang)}${hasSurgery ? `, ${t("יום ניתוח")}` : ""}, ${eventsLabel(list.length, t)}`
            : dayLabel(day, lang);
          return (
            <Link key={day} href={href({ d: day })} aria-label={dayAriaLabel} aria-current={day === t0 ? "date" : undefined}
              className={`block -outline-offset-2 min-h-16 p-1 sm:min-h-28 sm:p-1.5 ${inMonth ? "bg-surface" : "bg-paper"} ${day === d ? "outline outline-2 -outline-offset-2 outline-accent" : ""} hover:bg-accent-soft`}>
              <span className={`num mb-1 grid size-6 place-items-center rounded-full text-xs ${day === t0 ? "bg-accent text-white" : inMonth ? "" : "text-line-strong"}`}>
                {+day.slice(8)}
              </span>
              {/* desktop: chips; mobile: dots */}
              <span className="hidden space-y-0.5 sm:block">
                {shown.map((e) => <Chip key={e.id + e.kind} e={e} compact />)}
                {deadlines.length > 0 && shown.length < 2 && (
                  <span className="block truncate text-xs text-muted">{tasksLabel(deadlines.length, t)}</span>
                )}
                {deadlines.length > 0 && shown.length >= 2 && hidden > 0 && (
                  <span className="block text-xs text-muted">+{hidden}</span>
                )}
              </span>
              <span className="flex flex-wrap gap-0.5 sm:hidden">
                {list.slice(0, 4).map((e) => (
                  <span key={e.id + e.kind} className={`size-1.5 rounded-full ${DOT[e.tone]}`} />
                ))}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Agenda({ map, from, showPatient, t0, lang, t }: { map: Map<string, CalEvent[]>; from: string; showPatient?: boolean; t0: string; lang: Lang; t: T }) {
  const days = Array.from({ length: 60 }, (_, i) => addDays(from, i)).filter((day) => map.has(day));
  if (days.length === 0) return <p role="status" className="card mt-5 px-4 py-8 text-center text-muted">{t("אין אירועים בחודשיים הקרובים.")}</p>;
  return (
    <div className="mt-5 space-y-5">
      {days.map((day) => (
        <section key={day}>
          <h3 className="mb-1.5 text-sm font-medium">
            {dayLabel(day, lang)} <span className="font-normal text-muted">· {relativeDays(day, t0, lang)}</span>
          </h3>
          <div className="card divide-y divide-line">
            {map.get(day)!.map((e) => <EventRow key={e.id + e.kind} e={e} showPatient={showPatient} t={t} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
