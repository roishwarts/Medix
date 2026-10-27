import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadJourneys } from "@/lib/queries";
import { nowTask, OWNER_LABEL, type Task } from "@/lib/journey";
import { formatDate, formatDateLong, relativeDays, today } from "@/lib/dates";
import { Icon, ReadinessBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  const profile = await requireProfile(["patient", "caregiver"]);
  const [journey] = await loadJourneys();
  if (!journey) {
    return <p className="py-20 text-center text-muted">עדיין לא הוגדר עבורך מסלול. פנה/י למרפאה.</p>;
  }
  const { summary } = journey;
  const surgeryPassed = summary.daysToSurgery < 0;
  const t0 = today();

  const preop = summary.tasks.filter((t) => t.preop);
  const postop = summary.tasks.filter((t) => !t.preop);

  const now = nowTask(summary.tasks);
  const waiting = summary.tasks.filter((t) => t.owner === "patient" && t.state === "review");
  const nextAppt = surgeryPassed ? undefined : summary.tasks.find((t) => t.kind === "appointment" && t.state !== "done" && t.eventDate >= t0);

  const preopDone = preop.filter((t) => t.state === "done").length;
  // Collapse a long run of finished steps at the start of the journey.
  let leading = 0;
  while (leading < preop.length && preop[leading].state === "done") leading++;
  const folded = leading >= 3 ? preop.slice(0, leading) : [];
  const visiblePreop = preop.slice(folded.length);

  const heading = surgeryPassed ? "הניתוח הושלם" : summary.daysToSurgery === 0 ? "הניתוח היום" : `הניתוח ${relativeDays(journey.surgery_date)}`;

  return (
    <main className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-16">
      <div className="min-w-0 lg:sticky lg:top-24 lg:col-span-2">
        <p className="mb-1 text-muted">שלום {profile.full_name}</p>
        <h1 className="display text-3xl">{heading}</h1>
        <p className="mt-1 text-muted">{formatDateLong(journey.surgery_date)}</p>
        {surgeryPassed && <p className="mt-3 text-muted">מאחלים החלמה מהירה ושלמה.</p>}

        {!surgeryPassed && (
          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="font-medium">מוכנות לניתוח</span>
              <span className="num text-lg font-medium">{summary.readiness}%</span>
            </div>
            <ReadinessBar value={summary.readiness} state={summary.readinessState} />
            <p className="mt-2 text-sm text-muted">
              הושלמו <span className="num">{preopDone}</span> מתוך <span className="num">{preop.length}</span> שלבים
            </p>
          </div>
        )}

        {/* NOW */}
        {!surgeryPassed && (
          <section className="mt-8" aria-labelledby="now-title">
            {now ? (
              <Link href={`/journey/tasks/${now.id}`} className="card block border-accent-line p-5 transition hover:border-accent">
                <p className="text-sm font-medium text-accent">הצעד הבא שלך</p>
                <h2 id="now-title" className="display mt-1 break-words text-2xl">{now.title}</h2>
                {now.state === "rejected" && now.review_note && (
                  <p className="mt-3 break-words rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">הצוות החזיר לתיקון: {now.review_note}</p>
                )}
                {now.description && <p className="mt-2 line-clamp-4 break-words text-muted">{now.description}</p>}
                <p className={`mt-4 text-sm ${now.overdue ? "font-medium text-bad" : "text-muted"}`}>
                  {now.overdue ? "היה צריך להסתיים " : "עד "}
                  {formatDate(now.dueDate)} · {relativeDays(now.dueDate)}
                </p>
                <span className="btn btn-primary mt-3 w-full sm:w-auto">
                  {now.state === "rejected" ? "לתיקון" : now.requires_evidence ? "העלאת מסמך" : "להמשך"} <Icon name="arrow" />
                </span>
              </Link>
            ) : (
              <div className="card p-5">
                <p className="text-sm font-medium text-muted">הצעד הבא שלך</p>
                <h2 id="now-title" className="display mt-1 text-2xl">
                  {waiting.length > 0 ? "הכול אצל הצוות" : summary.readiness === 100 ? "הכול מוכן" : "אין כרגע משימה פתוחה"}
                </h2>
                <p className="mt-2 text-muted">
                  {waiting.length > 0
                    ? `שלחת ${waiting.length === 1 ? "משימה אחת" : `${waiting.length} משימות`} לבדיקה. נעדכן אותך ברגע שהצוות יאשר.`
                    : summary.readiness === 100
                      ? "סיימת את כל ההכנות. נתראה ביום הניתוח."
                      : "הצוות עובד על השלבים הבאים. נעדכן כשיהיה משהו לעשות."}
                </p>
              </div>
            )}
          </section>
        )}

        {/* NEXT APPOINTMENT */}
        {nextAppt && (
          <Link href={`/journey/tasks/${nextAppt.id}`} className="card mt-4 flex min-h-16 items-center justify-between gap-4 p-4 transition hover:border-line-strong">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted">התור הקרוב</p>
              <p className="mt-0.5 break-words font-medium">{nextAppt.title}</p>
              <p className="break-words text-sm text-muted">
                {formatDateLong(nextAppt.eventDate)}
                {nextAppt.eventTime && <> · <span className="num">{nextAppt.eventTime}</span></>}
                {nextAppt.location && <> · {nextAppt.location}</>}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-accent">{relativeDays(nextAppt.eventDate, t0)}</span>
          </Link>
        )}
      </div>

      {/* TIMELINE */}
      <section className="mt-10 min-w-0 lg:col-span-3 lg:mt-0" aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="mb-4 text-sm font-medium text-muted">המסע שלך</h2>
        <ol>
          {folded.length > 0 && (
            <li className="relative pb-7 ps-11">
              <span className="absolute start-0 top-0 grid size-7 place-items-center rounded-full bg-ok text-white" aria-hidden="true"><Icon name="check" size={14} /></span>
              <span className="absolute start-[13px] top-8 bottom-0 w-px bg-line" aria-hidden="true" />
              <details className="group">
                <summary className="flex min-h-7 cursor-pointer list-none items-center gap-2 font-medium text-muted [&::-webkit-details-marker]:hidden">
                  <span><span className="num">{folded.length}</span> שלבים הושלמו</span>
                  <span className="text-sm text-accent group-open:hidden">הצגה</span>
                  <span className="hidden text-sm text-accent group-open:inline">הסתרה</span>
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
          {visiblePreop.map((t) => (
            <TimelineItem key={t.id} task={t} isNow={t.id === now?.id} last={false} />
          ))}
          <li className="relative pb-8 ps-11">
            <span className="absolute start-0 top-0 grid size-7 place-items-center rounded-full bg-accent text-surface" aria-hidden="true">
              <span className="size-2 rounded-full bg-surface" />
            </span>
            {postop.length > 0 && <span className="absolute start-[13px] top-7 bottom-0 w-px bg-line" aria-hidden="true" />}
            <p className="display text-lg">יום הניתוח</p>
            <p className="text-sm text-muted">{formatDateLong(journey.surgery_date)}</p>
          </li>
          {postop.map((t, i) => (
            <TimelineItem key={t.id} task={t} isNow={t.id === now?.id} last={i === postop.length - 1} />
          ))}
        </ol>
      </section>
    </main>
  );
}

function TimelineItem({ task, isNow, last }: { task: Task; isNow: boolean; last: boolean }) {
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

  const sub =
    state === "done" ? "הושלם"
    : state === "review" ? "ממתין לבדיקת הצוות"
    : state === "locked" ? `ייפתח אחרי: ${task.blockedBy.map((b) => b.title).join(", ")}`
    : state === "rejected" ? "הוחזר לתיקון"
    : task.kind === "appointment" ? `${overdue ? "באיחור · " : ""}${formatDate(task.eventDate)}${task.eventTime ? ` · ${task.eventTime}` : ""}${task.location ? ` · ${task.location}` : ""}`
    : overdue ? `באיחור · היה עד ${formatDate(task.dueDate)}`
    : `עד ${formatDate(task.dueDate)}`;

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
          {task.owner !== "patient" && state !== "done" && ` · ${OWNER_LABEL[task.owner]}`}
        </p>
      </Link>
    </li>
  );
}
