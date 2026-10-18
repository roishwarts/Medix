import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { nowTask, OWNER_LABEL, type Task } from "@/lib/journey";
import { formatDate, formatDateLong, relativeDays, today } from "@/lib/dates";
import { Icon, ReadinessBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  const [journey] = await loadJourneys();
  if (!journey) {
    return <p className="py-20 text-center text-muted">עדיין לא הוגדר עבורך מסלול. פנה/י למרפאה.</p>;
  }
  const { summary } = journey;
  const now = nowTask(summary.tasks);
  const waiting = summary.tasks.filter((t) => t.owner === "patient" && t.state === "review");
  const surgeryPassed = summary.daysToSurgery < 0;
  const t0 = today();
  const nextAppt = summary.tasks.find((t) => t.kind === "appointment" && t.state !== "done" && t.eventDate >= t0);

  const preop = summary.tasks.filter((t) => t.preop);
  const postop = summary.tasks.filter((t) => !t.preop);

  return (
    <main>
      <h1 className="display text-3xl">
        {surgeryPassed ? "הניתוח הושלם" : summary.daysToSurgery === 0 ? "הניתוח היום" : `הניתוח ${relativeDays(journey.surgery_date)}`}
      </h1>
      <p className="mt-1 text-muted">{formatDateLong(journey.surgery_date)}</p>

      {!surgeryPassed && (
        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-muted">מוכנות לניתוח</span>
            <span className="num font-medium">{summary.readiness}%</span>
          </div>
          <ReadinessBar value={summary.readiness} state={summary.readinessState} />
        </div>
      )}

      {/* NOW */}
      {!surgeryPassed && (
        <section className="mt-8">
          {now ? (
            <Link href={`/journey/tasks/${now.id}`} className="card block border-accent-line p-5 transition hover:border-accent">
              <p className="eyebrow text-accent">עכשיו</p>
              <h2 className="display mt-1 text-2xl">{now.title}</h2>
              {now.state === "rejected" && now.review_note && (
                <p className="mt-3 rounded bg-bad-soft px-3 py-2 text-sm text-bad">הצוות החזיר לתיקון: {now.review_note}</p>
              )}
              {now.description && <p className="mt-2 text-muted">{now.description}</p>}
              <div className="mt-4 flex items-center justify-between">
                <span className={`text-sm ${now.overdue ? "font-medium text-bad" : "text-muted"}`}>
                  {now.overdue ? "היה צריך להסתיים " : "עד "}
                  {formatDate(now.dueDate)} · {relativeDays(now.dueDate)}
                </span>
                <span className="btn btn-primary btn-sm">
                  {now.requires_evidence ? "העלאת מסמך" : "להמשך"} <Icon name="arrow" />
                </span>
              </div>
            </Link>
          ) : (
            <div className="card p-5">
              <p className="eyebrow">עכשיו</p>
              <h2 className="display mt-1 text-2xl">
                {waiting.length > 0 ? "הכול אצל הצוות" : summary.readiness === 100 ? "הכול מוכן" : "אין משימה פתוחה אצלך"}
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
      {!surgeryPassed && nextAppt && (
        <Link href={`/journey/tasks/${nextAppt.id}`} className="card mt-4 flex items-center justify-between gap-4 p-4 hover:border-line-strong">
          <div className="min-w-0">
            <p className="eyebrow">התור הקרוב</p>
            <p className="mt-0.5 font-medium">{nextAppt.title}</p>
            <p className="text-sm text-muted">
              {formatDateLong(nextAppt.eventDate)}
              {nextAppt.eventTime && <> · <span className="num">{nextAppt.eventTime}</span></>}
              {nextAppt.location && <> · {nextAppt.location}</>}
            </p>
          </div>
          <span className="text-sm text-muted">{relativeDays(nextAppt.eventDate, t0)}</span>
        </Link>
      )}

      {/* TIMELINE */}
      <section className="mt-10">
        <h2 className="eyebrow mb-4">המסע שלך</h2>
        <ol>
          {preop.map((t, i) => (
            <TimelineItem key={t.id} task={t} isNow={t.id === now?.id} last={i === preop.length - 1 && postop.length === 0} />
          ))}
          <li className="relative pb-8 ps-11">
            <span className="absolute start-0 top-0 grid size-7 place-items-center rounded-full bg-accent text-surface">
              <span className="size-2 rounded-full bg-surface" />
            </span>
            <span className="absolute start-[13px] top-7 bottom-0 w-px bg-line" />
            <p className="display text-lg">יום הניתוח</p>
            <p className="text-sm text-muted">{formatDateLong(journey.surgery_date)}</p>
          </li>
          {postop.map((t, i) => (
            <TimelineItem key={t.id} task={t} isNow={false} last={i === postop.length - 1} />
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
    node = <span className="grid size-7 place-items-center rounded-full bg-accent text-white"><Icon name="check" size={14} /></span>;
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
    <li className="relative ps-11 pb-7">
      <span className="absolute start-0 top-0">{node}</span>
      {!last && <span className="absolute start-[13px] top-8 bottom-0 w-px bg-line" />}
      <Link href={`/journey/tasks/${task.id}`} className="block">
        <p className={`font-medium leading-snug ${state === "done" ? "text-muted" : state === "locked" ? "text-muted" : ""}`}>
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
