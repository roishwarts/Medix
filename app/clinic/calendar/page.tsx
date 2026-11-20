import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { clinicEvents, byDate, type CalEvent } from "@/lib/calendar";
import { parseCalParams } from "@/components/calendar";
import { MonthCard, UpcomingList } from "@/components/month-card";
import { Icon } from "@/components/ui";
import { formatDateLong, relativeDays, today } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT())("יומן") };
}

export default async function ClinicCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; d?: string; notReady?: string; sel?: string }>;
}) {
  const sp = await searchParams;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const { d } = parseCalParams(sp);
  const notReady = sp.notReady === "1";
  const all = (await loadJourneys()).filter((j) => !j.cancelled_at);
  const journeys = notReady ? all.filter((j) => j.summary.readiness < 100) : all;
  const events = clinicEvents(journeys, t);
  const t0 = today();

  const link = (over: { d?: string; sel?: string; notReady?: boolean }) => {
    const p = new URLSearchParams();
    p.set("d", over.d ?? d);
    if (over.sel) p.set("sel", over.sel);
    if (over.notReady ?? notReady) p.set("notReady", "1");
    return `/clinic/calendar?${p.toString()}`;
  };

  const sorted = (list: CalEvent[]) => [...list].sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  const next = sorted(events.filter((e) => e.kind !== "deadline" && e.date >= t0))[0];
  // In date order. On the same day: surgery, then appointments (by time), then deadlines.
  const rank = { surgery: 0, appointment: 1, deadline: 2 } as const;
  const upcoming = events
    .filter((e) => e.date >= t0)
    .sort((a, b) => a.date.localeCompare(b.date) || rank[a.kind] - rank[b.kind] || (a.time ?? "99:99").localeCompare(b.time ?? "99:99"))
    .slice(0, 6);
  const selected = sp.sel && /^\d{4}-\d{2}-\d{2}$/.test(sp.sel) ? byDate(events).get(sp.sel) ?? [] : null;

  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="display text-3xl sm:text-4xl">{t("יומן")}</h1>
          {notReady && (
            <p className="mt-1 text-sm text-muted" aria-live="polite">
              {t("מוצגים רק מטופלים שעדיין לא מוכנים ({n} מתוך {total})", { n: journeys.length, total: all.length })}
            </p>
          )}
        </div>
        <Link href={link({ notReady: !notReady })} aria-current={notReady ? "page" : undefined} className={`btn ${notReady ? "btn-primary" : ""}`}>
          {notReady && <Icon name="check" size={16} />}
          {t("לא מוכנים בלבד")}
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-8">
        <div className="card border-[#9ccbd6] px-[18px] py-4 lg:col-start-2 lg:row-start-1">
          <p className="text-sm font-semibold text-accent">{t("הבא בתור")}</p>
          {next ? (
            <>
              <Link href={next.href} className="mt-0.5 block text-[17px] font-medium">{next.title}</Link>
              <p className="text-sm text-muted">
                {formatDateLong(next.date, lang)}{next.time ? <> · <span className="num" dir="ltr">{next.time}</span></> : null}
                {next.sub ? ` · ${next.sub}` : ""} ({relativeDays(next.date, t0, lang)})
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-muted">{t("אין כרגע ניתוח או תורים קרובים ביומן.")}</p>
          )}
        </div>

        <div className="lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <MonthCard
            d={d} t0={t0} events={events} lang={lang} t={t}
            navHref={(day) => link({ d: day })}
            dayHref={(day, list) => (list.length === 1 ? list[0].href : link({ d: day, sel: day }))}
          />
        </div>

        {selected && (
          <section aria-labelledby="h-day" aria-live="polite" className="lg:col-start-2">
            <h2 id="h-day" className="eyebrow mb-2">{formatDateLong(sp.sel!, lang)}</h2>
            {selected.length === 0 ? (
              <p className="card px-4 py-6 text-center text-muted">{t("אין אירועים ביום הזה.")}</p>
            ) : (
              <ul className="card divide-y divide-line">
                {selected.map((e) => (
                  <li key={e.id + e.kind}>
                    <Link href={e.href} className="link-row block px-4 py-3">
                      <span className="block font-medium">{e.title}</span>
                      <span className="block text-sm text-muted">
                        {e.patient && e.kind !== "surgery" ? `${e.patient} · ` : ""}
                        {e.time ? <span className="num" dir="ltr">{e.time}</span> : e.kind === "deadline" ? t("מועד יעד") : ""}
                        {e.sub ? ` · ${e.sub}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {upcoming.length > 0 && (
          <section aria-labelledby="h-soon" className="lg:col-start-2">
            <h2 id="h-soon" className="eyebrow mb-2">{t("בקרוב")}</h2>
            <UpcomingList events={upcoming} lang={lang} t={t} googleOnly showPatient />
          </section>
        )}
      </div>
    </main>
  );
}
