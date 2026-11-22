import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { loadJourneys } from "@/lib/queries";
import { actionItems, blockerLabel, type ActionItem } from "@/lib/journey";
import { diffDays, formatDate, relativeDays, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

// A standalone, Sunday-morning-style snapshot: what a doctor would have gotten in a weekly email,
// read on demand instead. See /clinic for the live, always-current version of the same data.
export default async function WeeklySummaryPage() {
  const [t, lang, allJourneys] = await Promise.all([getT(), getLang(), loadJourneys()]);
  // A cancelled surgery no longer needs the clinic's attention; it stays on the patient's own card.
  const journeys = allJourneys.filter((j) => !j.cancelled_at);
  const t0 = today();

  const thisWeek = journeys
    .filter((j) => diffDays(j.surgery_date, t0) >= 0 && diffDays(j.surgery_date, t0) <= 7)
    .sort((a, b) => (a.surgery_date < b.surgery_date ? -1 : 1));
  const notReady = thisWeek.filter((j) => j.summary.readiness < 100);

  const items: ActionItem[] = journeys.flatMap((j) => actionItems(j.patient_id, j.patient.full_name, j.surgery_date, j.summary.tasks, t0));
  const rejected = items.filter((i) => i.kind === "rejected");
  const overdue = items.filter((i) => i.kind === "overdue");
  const review = items.filter((i) => i.kind === "review");
  const journeyByPatient = new Map(journeys.map((j) => [j.patient_id, j.id]));

  // Calm numbers: only what is late or returned is coloured.
  const tone = (n: number) => (n > 0 ? "text-bad" : "text-ink");
  const tile = "card relative block min-h-36 min-w-0 p-5 transition hover:border-line-strong sm:p-6";

  return (
    <main className="space-y-8 pb-6">
      <header>
        <h1 className="display text-4xl">{t("סיכום השבוע")}</h1>
        <p className="mt-2 text-muted">{t("בכל המטופלים הפעילים, לא רק מי שמנותח השבוע")}</p>
      </header>

      <section aria-label={t("סיכום השבוע")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/clinic/patients?days=7" className={tile}>
          <p className="text-sm text-muted">{t("ניתוחים השבוע")}</p>
          <p className="display num mt-2 text-5xl sm:text-6xl">{thisWeek.length}</p>
          {thisWeek.length > 0 && <p className="mt-1 text-[13px] text-muted">{t("{n} מתוך {total} עדיין לא מוכנים", { n: notReady.length, total: thisWeek.length })}</p>}
        </Link>
        <Link href="/clinic/tasks?status=rejected" className={tile}>
          {rejected.length > 0 && <span aria-hidden className="absolute inset-y-6 start-0 w-1 rounded-full bg-bad" />}
          <p className="text-sm text-muted">{t("הוחזר לתיקון")}</p>
          <p className={`display num mt-2 text-5xl sm:text-6xl ${tone(rejected.length)}`}>{rejected.length}</p>
        </Link>
        <Link href="/clinic/tasks?status=overdue" className={tile}>
          {overdue.length > 0 && <span aria-hidden className="absolute inset-y-6 start-0 w-1 rounded-full bg-bad" />}
          <p className="text-sm text-muted">{t("באיחור")}</p>
          <p className={`display num mt-2 text-5xl sm:text-6xl ${tone(overdue.length)}`}>{overdue.length}</p>
        </Link>
        <Link href="/clinic/tasks?status=review" className={tile}>
          <p className="text-sm text-muted">{t("ממתין לבדיקה")}</p>
          <p className="display num mt-2 text-5xl sm:text-6xl">{review.length}</p>
          {review.length > 0 && <p className="mt-1 text-[13px] text-muted">{t("מחכים לאישור שלך")}</p>}
        </Link>
      </section>

      <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
        <section aria-labelledby="h-surgeries" className={`min-w-0 ${rejected.length > 0 ? "lg:col-span-3" : "lg:col-span-5"}`}>
          <h2 id="h-surgeries" className="mb-3 text-xl font-semibold sm:text-2xl">{t("ניתוחי השבוע")}</h2>
          {thisWeek.length === 0 ? (
            <p className="card px-4 py-8 text-center text-muted">{t("אין ניתוחים ב־7 הימים הקרובים.")}</p>
          ) : (
            <div className="card divide-y divide-line">
              {thisWeek.map((j) => {
                const ready = j.summary.readiness === 100;
                const day = j.surgery_date.slice(8, 10).replace(/^0/, "");
                return (
                  <Link key={j.id} href={`/clinic/patients/${j.id}`} className="flex items-center gap-4 px-4 py-3.5 link-row md:px-6 md:py-4">
                    <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-center leading-tight text-white">
                      <span><span className="num block text-base font-semibold">{day}</span><span className="block text-[11px]">{formatDate(j.surgery_date, lang).replace(/^\d+\s*/, "")}</span></span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-semibold">{j.patient.full_name}</span>
                      <span className="block break-words text-sm text-muted">{j.summary.topBlocker ? blockerLabel(j.summary.topBlocker, t) : t("ההכנות הושלמו")}</span>
                      <span className="block text-xs text-muted">{formatDate(j.surgery_date, lang)} · {relativeDays(j.surgery_date, t0, lang)}</span>
                    </span>
                    <span className="num shrink-0 text-sm font-medium text-muted">{j.summary.readiness}%</span>
                    <span className={`pill shrink-0 ${ready ? "pill-ok" : "pill-bad"}`}>{ready ? t("מוכן") : t("לא מוכן")}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {rejected.length > 0 && (
          <section aria-labelledby="h-rejected" className="min-w-0 lg:col-span-2">
            <h2 id="h-rejected" className="mb-3 text-xl font-semibold text-bad sm:text-2xl">{t("הוחזר לתיקון")}</h2>
            <div className="card divide-y divide-line">
              {rejected.map((i) => (
                <Link key={i.task.id} href={`/clinic/patients/${journeyByPatient.get(i.patientId)}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3.5 link-row md:px-6">
                  <span className="min-w-0 break-words font-semibold">{i.patientName}</span>
                  <span className="text-sm text-bad">{relativeDays(i.task.dueDate, t0, lang)}</span>
                  <span className="col-span-2 min-w-0 break-words text-sm text-muted">{i.task.title}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
