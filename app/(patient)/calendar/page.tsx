import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { patientEvents } from "@/lib/calendar";
import { today, relativeDays, formatDateLong } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { Calendar, parseCalParams } from "@/components/calendar";
import { AddEventButton } from "@/components/add-event-button";
import { LOCALE } from "@/lib/dates";

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
  const next = events
    .filter((e) => e.kind !== "deadline" && e.date >= t0)
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))[0];
  // The next few things on the calendar: the surgery, appointments and the deadlines that are still open.
  const upcoming = events
    .filter((e) => e.date >= t0 && (e.kind !== "deadline" || e.tone !== "ok"))
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
    .slice(0, 6);
  return (
    <main>
      <h1 className="display text-3xl">{t("היומן שלך")}</h1>
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

      {/* Coming up: each item has its own "add to calendar" button. */}
      {upcoming.length > 0 && (
        <section className="mt-8" aria-labelledby="h-soon">
          <h2 id="h-soon" className="eyebrow mb-2">{t("בקרוב")}</h2>
          <ul className="card divide-y divide-line">
            {upcoming.map((e) => {
              const box = e.kind === "surgery" ? "bg-accent text-white" : e.kind === "appointment" ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn";
              const day = e.date.slice(8, 10).replace(/^0/, "");
              const month = new Date(`${e.date}T12:00:00`).toLocaleDateString(LOCALE[lang], { month: "short" });
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`grid size-14 shrink-0 place-items-center rounded-xl text-center leading-tight ${box}`} aria-hidden="true">
                    <span><span className="num block text-lg font-semibold">{day}</span><span className="block text-xs">{month}</span></span>
                  </span>
                  <Link href={e.href} className="min-w-0 flex-1 break-words">
                    <span className="block font-medium">{e.title}</span>
                    <span className="block text-sm text-muted">
                      {e.kind === "deadline" ? t("מועד יעד") : formatDateLong(e.date, lang)}
                      {e.time ? <> · <span className="num" dir="ltr">{e.time}</span></> : null}
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
    </main>
  );
}
