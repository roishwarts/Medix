import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { patientEvents } from "@/lib/calendar";
import { today, relativeDays, formatDateLong } from "@/lib/dates";
import { Calendar, parseCalParams } from "@/components/calendar";

export const dynamic = "force-dynamic";

export const metadata = { title: "היומן שלך" };

const LEGEND = [
  { label: "ניתוח", cls: "bg-accent" },
  { label: "הושלם", cls: "bg-ok" },
  { label: "דורש תשומת לב", cls: "bg-warn" },
  { label: "באיחור", cls: "bg-bad" },
  { label: "ממתין", cls: "bg-line-strong" },
];

export default async function PatientCalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; d?: string }> }) {
  const { view, d } = parseCalParams(await searchParams);
  const [journey] = await loadJourneys();
  if (!journey)
    return (
      <main className="py-20 text-center">
        <h1 className="display mb-2 text-3xl">היומן שלך</h1>
        <p className="text-muted" role="status">עדיין לא הוגדר עבורך מסלול. פנה/י למרפאה.</p>
      </main>
    );
  const events = patientEvents(journey);
  const t0 = today();
  const next = events
    .filter((e) => e.kind !== "deadline" && e.date >= t0)
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))[0];
  return (
    <main>
      <h1 className="display text-3xl">היומן שלך</h1>
      <p className="mb-5 mt-1 text-muted">
        {next ? (
          <>
            הבא בתור:{" "}
            <Link href={next.href} className="font-medium text-ink underline decoration-line-strong underline-offset-4">
              {next.title}
            </Link>{" "}
            · {formatDateLong(next.date)}
            {next.time ? <> בשעה <span className="num" dir="ltr">{next.time}</span></> : null} ({relativeDays(next.date, t0)})
          </>
        ) : (
          "אין כרגע ניתוח או תורים קרובים ביומן."
        )}
      </p>
      <Calendar events={events} view={view} d={d} basePath="/calendar" />
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" aria-label="מקרא צבעים">
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span aria-hidden className={`size-2.5 rounded-full ${l.cls}`} />
            {l.label}
          </li>
        ))}
      </ul>
    </main>
  );
}
