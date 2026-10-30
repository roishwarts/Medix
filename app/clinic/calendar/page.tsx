import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { clinicEvents } from "@/lib/calendar";
import { Calendar, parseCalParams } from "@/components/calendar";
import { Icon } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";

export const dynamic = "force-dynamic";

export default async function ClinicCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; d?: string; notReady?: string }>;
}) {
  const sp = await searchParams;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const { view, d } = parseCalParams(sp);
  const notReady = sp.notReady === "1";
  const all = await loadJourneys();
  const journeys = notReady ? all.filter((j) => j.summary.readiness < 100) : all;

  const toggle = new URLSearchParams({ view, d });
  if (!notReady) toggle.set("notReady", "1");

  const legend = [
    ["bg-ok", "מוכן / הושלם"],
    ["bg-warn", "ממתין לבדיקה"],
    ["bg-bad", "לא מוכן / באיחור"],
    ["bg-accent", "ניתוח או מוכנות בתהליך"],
    ["bg-line-strong", "טרם התחיל"],
  ] as const;

  return (
    <main>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="display text-4xl">{t("יומן")}</h1>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {notReady
              ? t("מוצגים רק מטופלים שעדיין לא מוכנים ({n} מתוך {total})", { n: journeys.length, total: all.length })
              : t("ניתוחים, תורים ומועדי משימות של כל המטופלים")}
          </p>
        </div>
        <Link href={`/clinic/calendar?${toggle.toString()}`} aria-current={notReady ? "true" : undefined}
          className={`btn ${notReady ? "btn-primary" : ""}`}>
          {notReady && <Icon name="check" size={16} />}
          {t("לא מוכנים בלבד")}
        </Link>
      </div>
      <Calendar events={clinicEvents(journeys, t)} view={view} d={d} basePath="/clinic/calendar" lang={lang}
        query={{ notReady: notReady ? "1" : undefined }} showPatient />
      <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" aria-label={t("מקרא צבעים")}>
        {legend.map(([dot, label]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
            {t(label)}
          </li>
        ))}
      </ul>
    </main>
  );
}
