import Link from "next/link";
import { Icon } from "@/components/ui";
import { nowTask, ownerLabel, type Task } from "@/lib/journey";
import { formatDate, formatDateLong } from "@/lib/dates";
import type { T } from "@/lib/i18n";
import type { Lang } from "@/lib/prefs";
import type { PatientJourney } from "@/lib/queries";

// "The journey": every step of the preparation, the surgery day and the recovery, as one vertical timeline.
// On a phone it has its own screen (reached from the home page); on a wide screen it sits next to the home cards.
export function JourneyTimeline({ journey, t, lang, className }: { journey: PatientJourney; t: T; lang: Lang; className?: string }) {
  const { summary } = journey;
  const preop = summary.tasks.filter((x) => x.preop);
  const postop = summary.tasks.filter((x) => !x.preop);
  const now = nowTask(summary.tasks);
  // Collapse a long run of finished steps at the start of the journey.
  let leading = 0;
  while (leading < preop.length && preop[leading].state === "done") leading++;
  const folded = leading >= 3 ? preop.slice(0, leading) : [];
  const visiblePreop = preop.slice(folded.length);

  return (
  <section className={className} aria-labelledby="timeline-title">
    <h2 id="timeline-title" className="mb-4 text-sm font-medium text-muted">{t("המסע שלך")}</h2>
    <ol>
      {folded.length > 0 && (
        <li className="relative pb-7 ps-11">
          <span className="absolute start-0 top-0 grid size-7 place-items-center rounded-full bg-ok text-white" aria-hidden="true"><Icon name="check" size={14} /></span>
          <span className="absolute start-[13px] top-8 bottom-0 w-px bg-line" aria-hidden="true" />
          <details className="group">
            <summary className="flex min-h-7 cursor-pointer list-none flex-wrap items-center gap-x-2 font-medium text-muted [&::-webkit-details-marker]:hidden">
              <span>{t("{n} שלבים הושלמו", { n: folded.length })}</span>
              <span className="text-sm text-accent group-open:hidden">{t("הצגה")}</span>
              <span className="hidden text-sm text-accent group-open:inline">{t("הסתרה")}</span>
            </summary>
            <ol className="mt-3 space-y-2 border-s border-line ps-4">
              {folded.map((t) => (
                <li key={t.id}>
                  <Link href={`/journey/tasks/${t.id}`} className="flex min-h-11 items-center gap-2 break-words text-muted">
                    <Icon name="check" size={14} /> {t.title}
                  </Link>
                </li>
              ))}
            </ol>
          </details>
        </li>
      )}
      {visiblePreop.map((tk) => (
        <TimelineItem key={tk.id} task={tk} isNow={tk.id === now?.id} last={false} t={t} lang={lang} />
      ))}
      <li className="relative pb-8 ps-11">
        <span className="absolute start-0 top-0 grid size-7 place-items-center rounded-full bg-accent text-surface" aria-hidden="true">
          <span className="size-2 rounded-full bg-surface" />
        </span>
        {postop.length > 0 && <span className="absolute start-[13px] top-7 bottom-0 w-px bg-line" aria-hidden="true" />}
        <p className="display text-lg">{t("יום הניתוח")}</p>
        <p className="text-sm text-muted">{formatDateLong(journey.surgery_date, lang)}</p>
      </li>
      {postop.map((tk, i) => (
        <TimelineItem key={tk.id} task={tk} isNow={tk.id === now?.id} last={i === postop.length - 1} t={t} lang={lang} />
      ))}
    </ol>
  </section>
  );
}

function TimelineItem({ task, isNow, last, t, lang }: { task: Task; isNow: boolean; last: boolean; t: T; lang: Lang }) {
  const { state, overdue } = task;
  let node: React.ReactNode;
  if (state === "done") {
    node = <span className="grid size-7 place-items-center rounded-full bg-ok text-white"><Icon name="check" size={14} /></span>;
  } else if (isNow) {
    node = <span className={`grid size-7 place-items-center rounded-full border-2 ${overdue ? "border-bad" : "border-accent"} bg-surface`}><span className={`size-2.5 rounded-full ${overdue ? "bg-bad" : "bg-accent"}`} /></span>;
  } else if (state === "review") {
    node = <span className="grid size-7 place-items-center rounded-full border-2 border-warn bg-warn-soft text-warn"><Icon name="clock" size={14} /></span>;
  } else if (state === "locked") {
    node = <span className="grid size-7 place-items-center rounded-full border border-dashed border-line-strong bg-paper text-muted"><Icon name="lock" size={12} /></span>;
  } else if (overdue || state === "rejected") {
    node = <span className="grid size-7 place-items-center rounded-full border-2 border-bad bg-bad-soft text-bad"><Icon name="alert" size={14} /></span>;
  } else {
    node = <span className="block size-7 rounded-full border-2 border-line-strong bg-surface" />;
  }

  const when = (iso: string) => formatDate(iso, lang);
  const sub =
    state === "done" ? t("הושלם")
    : state === "review" ? t("ממתין לבדיקת הצוות")
    : state === "locked" ? t("ייפתח אחרי: {list}", { list: task.blockedBy.map((b) => b.title).join(", ") })
    : state === "rejected" ? t("הוחזר לתיקון")
    : task.kind === "appointment" ? `${overdue ? t("באיחור") + " · " : ""}${when(task.eventDate)}${task.eventTime ? ` · ${task.eventTime}` : ""}${task.location ? ` · ${task.location}` : ""}`
    : overdue ? t("באיחור · היה עד {date}", { date: when(task.dueDate) })
    : t("עד {date}", { date: when(task.dueDate) });

  return (
    <li className="relative pb-5 ps-11" aria-current={isNow ? "step" : undefined}>
      <span className="absolute start-0 top-0" aria-hidden="true">{node}</span>
      {!last && <span className="absolute start-[13px] top-8 bottom-0 w-px bg-line" aria-hidden="true" />}
      <Link href={`/journey/tasks/${task.id}`} className="block min-h-11 break-words">
        <p className={`font-medium leading-snug ${state === "done" || state === "locked" ? "text-muted" : ""}`}>
          {task.title}
        </p>
        <p className={`mt-0.5 text-sm ${overdue || state === "rejected" ? "text-bad" : "text-muted"}`}>
          {sub}
          {task.owner !== "patient" && state !== "done" && ` · ${ownerLabel(task.owner, t)}`}
        </p>
      </Link>
    </li>
  );
}
