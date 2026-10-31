import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { patientEvents } from "@/lib/calendar";
import { today, relativeDays, formatDateLong } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { Calendar, parseCalParams } from "@/components/calendar";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT())("היומן שלך") };
}

const LEGEND = [
  { label: "ניתוח", cls: "bg-accent" },
  { label: "הושלם", cls: "bg-ok" },
  { label: "דורש תשומת לב", cls: "bg-warn" },
  { label: "באיחור", cls: "bg-bad" },
  { label: "ממתין", cls: "bg-line-strong" },
];

export default async function PatientCalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; d?: string }> }) {
  const { view, d } = parseCalParams(await searchParams);
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [journey] = await loadJourneys();
  if (!journey)
    return (
      <main className="py-20 text-center">
        <h1 className="display mb-2 text-3xl">{t("היומן שלך")}</h1>
        <p className="text-muted" role="status">{t("עדיין לא הוגדר עבורך מסלול. פנה/י למרפאה.")}</p>
      </main>
    );
  const events = patientEvents(journey, t);
  const t0 = today();
  const next = events
    .filter((e) => e.kind !== "deadline" && e.date >= t0)
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))[0];
  return (
    <main>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="display text-3xl">{t("היומן שלך")}</h1>
        <a href="/api/calendar/ics" className="btn btn-sm">{t("הוספה ליומן")}</a>
      </div>
      <p className="mb-5 mt-1 text-muted">
        {next ? (
          <>
            {t("הבא בתור:")}{" "}
            <Link href={next.href} className="font-medium text-ink underline decoration-line-strong underline-offset-4">
              {next.title}
            </Link>{" "}
            · {formatDateLong(next.date, lang)}
            {next.time ? <> {t("בשעה")} <span className="num" dir="ltr">{next.time}</span></> : null} ({relativeDays(next.date, t0, lang)})
          </>
        ) : (
          t("אין כרגע ניתוח או תורים קרובים ביומן.")
        )}
      </p>
      <Calendar events={events} view={view} d={d} basePath="/calendar" lang={lang} />
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" aria-label={t("מקרא צבעים")}>
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span aria-hidden className={`size-2.5 rounded-full ${l.cls}`} />
            {t(l.label)}
          </li>
        ))}
      </ul>
    </main>
  );
}
