import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { patientEvents } from "@/lib/calendar";
import { today, relativeDays, formatDateLong } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { parseCalParams } from "@/components/calendar";
import type { CalEvent } from "@/lib/calendar";
import { MonthCard, UpcomingList } from "@/components/month-card";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT())("היומן שלך") };
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
          <MonthCard d={d} t0={t0} events={events} lang={lang} t={t} navHref={hrefFor} dayHref={(_, list) => list[0].href} />
        </div>

        {upcoming.length > 0 && (
          <section aria-labelledby="h-soon" className="lg:col-start-2 lg:row-start-2">
            <h2 id="h-soon" className="eyebrow mb-2">{t("בקרוב")}</h2>
            <UpcomingList events={upcoming} lang={lang} t={t} />
          </section>
        )}
      </div>
    </main>
  );
}
