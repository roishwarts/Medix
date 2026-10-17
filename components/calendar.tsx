import Link from "next/link";
import {
  addDays, addMonths, dayLabel, formatDate, monthTitle, relativeDays, startOfWeek, today as getToday, weekday,
  weekdayNames,
} from "@/lib/dates";
import { byDate, type CalEvent, type CalTone } from "@/lib/calendar";
import { Icon } from "@/components/ui";

export type CalView = "month" | "week" | "agenda";

const CHIP: Record<CalTone, string> = {
  ok: "bg-ok-soft text-ok",
  bad: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  neutral: "bg-paper text-ink ring-1 ring-inset ring-line",
  accent: "bg-accent text-surface",
};

const DOT: Record<CalTone, string> = {
  ok: "bg-ok",
  bad: "bg-bad",
  warn: "bg-warn",
  neutral: "bg-line-strong",
  accent: "bg-accent",
};

const tasksLabel = (n: number) => (n === 1 ? "משימה אחת" : `${n} משימות`);

export function parseCalParams(sp: { view?: string; d?: string }) {
  const view: CalView = sp.view === "week" || sp.view === "agenda" ? sp.view : "month";
  const valid = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) && !Number.isNaN(Date.parse(sp.d));
  return { view, d: valid ? (sp.d as string) : getToday() };
}

function Chip({ e, compact }: { e: CalEvent; compact?: boolean }) {
  return (
    <span className={`block truncate rounded px-1.5 py-0.5 text-[11px] leading-snug ${CHIP[e.tone]}`}>
      {e.time && <span className="num me-1 font-medium">{e.time}</span>}
      {compact && e.patient && e.kind !== "surgery" ? `${e.patient} · ` : ""}
      {e.title}
    </span>
  );
}

function EventRow({ e, showPatient }: { e: CalEvent; showPatient?: boolean }) {
  return (
    <Link href={e.href} className="flex items-start gap-3 px-4 py-3 hover:bg-paper">
      <span className="num w-12 shrink-0 pt-0.5 text-sm text-muted">{e.time ?? (e.kind === "surgery" ? "ניתוח" : "יעד")}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium leading-snug">{e.title}</span>
        <span className="block text-sm text-muted">
          {showPatient && e.patient && e.kind !== "surgery" ? `${e.patient}` : ""}
          {showPatient && e.patient && e.kind !== "surgery" && e.sub ? " · " : ""}
          {e.sub}
        </span>
      </span>
      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[e.tone]}`} />
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
}: {
  events: CalEvent[];
  view: CalView;
  d: string;
  basePath: string;
  query?: Record<string, string | undefined>;
  showPatient?: boolean;
}) {
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
      ? monthTitle(d)
      : view === "week"
        ? `${formatDate(startOfWeek(d))} – ${formatDate(addDays(startOfWeek(d), 6))}`
        : `מ-${formatDate(d)}`;

  const names = weekdayNames();
  const dayEvents = map.get(d) ?? [];

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link href={href({ d: prev })} aria-label="הקודם" className="btn btn-sm px-2 [&_svg]:rotate-180"><Icon name="arrow" size={16} /></Link>
          <Link href={href({ d: t0 })} className="btn btn-sm">היום</Link>
          <Link href={href({ d: next })} aria-label="הבא" className="btn btn-sm px-2"><Icon name="arrow" size={16} /></Link>
          <h2 className="display ms-3 text-2xl">{title}</h2>
        </div>
        <div className="flex overflow-hidden rounded border border-ink text-sm">
          {([["month", "חודש"], ["week", "שבוע"], ["agenda", "רשימה"]] as const).map(([v, label]) => (
            <Link key={v} href={href({ view: v })} aria-current={view === v ? "page" : undefined}
              className={`px-3 py-1.5 ${view === v ? "bg-ink text-surface" : "hover:bg-paper"}`}>{label}</Link>
          ))}
        </div>
      </div>

      {view === "month" && (
        <MonthGrid d={d} t0={t0} map={map} names={names} href={href} />
      )}

      {view === "week" && (
        <div className="mt-5 grid gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(d), i)).map((day) => {
            const list = map.get(day) ?? [];
            return (
              <div key={day} className={`min-h-28 bg-surface p-2 sm:min-h-64 ${day === t0 ? "bg-accent-soft" : ""}`}>
                <p className="mb-2 text-xs text-muted">
                  <span className="font-medium text-ink">{names[weekday(day)]}</span> {formatDate(day)}
                </p>
                <div className="space-y-1">
                  {list.map((e) => (
                    <Link key={e.id + e.kind} href={e.href} className="block"><Chip e={e} compact={showPatient} /></Link>
                  ))}
                  {list.length === 0 && <span className="text-xs text-line-strong sm:hidden">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "agenda" && <Agenda map={map} from={d} showPatient={showPatient} t0={t0} />}

      {view !== "agenda" && (
        <section className="mt-6">
          <h3 className="eyebrow mb-2">
            {dayLabel(d)} · {relativeDays(d, t0)}
          </h3>
          {dayEvents.length === 0 ? (
            <p className="card px-4 py-6 text-center text-muted">אין אירועים ביום הזה.</p>
          ) : (
            <div className="card divide-y divide-line">
              {dayEvents.map((e) => <EventRow key={e.id + e.kind} e={e} showPatient={showPatient} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function MonthGrid({
  d, t0, map, names, href,
}: {
  d: string; t0: string; map: Map<string, CalEvent[]>; names: string[];
  href: (o: { view?: CalView; d?: string }) => string;
}) {
  const first = d.slice(0, 7) + "-01";
  const gridStart = startOfWeek(first);
  const month = d.slice(0, 7);
  const weeks = Math.ceil((weekday(first) + new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="mt-5 overflow-hidden rounded border border-line bg-line">
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
          return (
            <Link key={day} href={href({ d: day })} aria-label={dayLabel(day)}
              className={`block min-h-16 p-1 sm:min-h-28 sm:p-1.5 ${inMonth ? "bg-surface" : "bg-paper"} ${day === d ? "outline outline-2 -outline-offset-2 outline-ink" : ""} hover:bg-accent-soft`}>
              <span className={`num mb-1 grid size-6 place-items-center rounded-full text-xs ${day === t0 ? "bg-ink text-surface" : inMonth ? "" : "text-line-strong"}`}>
                {+day.slice(8)}
              </span>
              {/* desktop: chips; mobile: dots */}
              <span className="hidden space-y-0.5 sm:block">
                {shown.map((e) => <Chip key={e.id + e.kind} e={e} compact />)}
                {deadlines.length > 0 && shown.length < 2 && (
                  <span className="block truncate text-[11px] text-muted">{tasksLabel(deadlines.length)}</span>
                )}
                {deadlines.length > 0 && shown.length >= 2 && hidden > 0 && (
                  <span className="block text-[11px] text-muted">+{hidden}</span>
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

function Agenda({ map, from, showPatient, t0 }: { map: Map<string, CalEvent[]>; from: string; showPatient?: boolean; t0: string }) {
  const days = Array.from({ length: 60 }, (_, i) => addDays(from, i)).filter((day) => map.has(day));
  if (days.length === 0) return <p className="card mt-5 px-4 py-8 text-center text-muted">אין אירועים בחודשיים הקרובים.</p>;
  return (
    <div className="mt-5 space-y-5">
      {days.map((day) => (
        <section key={day}>
          <h3 className="mb-1.5 text-sm font-medium">
            {dayLabel(day)} <span className="font-normal text-muted">· {relativeDays(day, t0)}</span>
          </h3>
          <div className="card divide-y divide-line">
            {map.get(day)!.map((e) => <EventRow key={e.id + e.kind} e={e} showPatient={showPatient} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
