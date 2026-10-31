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
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const journeys = await loadJourneys();
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

  const stat = (n: number) => (n === 0 ? "text-ok" : "text-bad");

  return (
    <main className="max-w-2xl space-y-8 pb-6">
      <header>
        <h1 className="display text-4xl">{t("סיכום השבוע")}</h1>
      </header>

      <section className="card space-y-3 p-5">
        <p className="text-lg">
          {t("השבוע: ")}
          <span className="num font-semibold">{thisWeek.length}</span> {thisWeek.length === 1 ? t("ניתוח") : t("ניתוחים")}
          {thisWeek.length > 0 && (
            <>
              {", "}
              <span className={`num font-semibold ${stat(notReady.length)}`}>{thisWeek.length - notReady.length}</span> {t("מוכנים")}
              {notReady.length > 0 && (
                <>
                  {" · "}
                  <span className="num font-semibold text-bad">{notReady.length}</span> {t("עדיין לא")}
                </>
              )}
            </>
          )}
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Link href="/clinic/tasks?status=rejected" className="block min-h-11 rounded-xl py-1 transition hover:bg-paper">
            <p className={`num display text-3xl ${stat(rejected.length)}`}>{rejected.length}</p>
            <p className="text-sm text-muted">{t("הוחזר לתיקון")}</p>
          </Link>
          <Link href="/clinic/tasks?status=overdue" className="block min-h-11 rounded-xl py-1 transition hover:bg-paper">
            <p className={`num display text-3xl ${stat(overdue.length)}`}>{overdue.length}</p>
            <p className="text-sm text-muted">{t("באיחור")}</p>
          </Link>
          <Link href="/clinic/tasks?status=review" className="block min-h-11 rounded-xl py-1 transition hover:bg-paper">
            <p className="num display text-3xl text-warn">{review.length}</p>
            <p className="text-sm text-muted">{t("ממתין לבדיקה")}</p>
          </Link>
        </div>
        <p className="text-xs text-muted">{t("בכל המטופלים הפעילים, לא רק מי שמנותח השבוע")}</p>
      </section>

      <section aria-labelledby="h-surgeries">
        <h2 id="h-surgeries" className="mb-3 text-lg font-medium">{t("ניתוחי השבוע")}</h2>
        {thisWeek.length === 0 ? (
          <p className="card px-4 py-8 text-center text-muted">{t("אין ניתוחים ב־7 הימים הקרובים.")}</p>
        ) : (
          <div className="card divide-y divide-line">
            {thisWeek.map((j) => (
              <Link key={j.id} href={`/clinic/patients/${j.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 link-row">
                <span className="min-w-0 break-words font-medium">{j.patient.full_name}</span>
                <span className={`num text-sm font-medium ${j.summary.readiness === 100 ? "text-ok" : "text-bad"}`}>{j.summary.readiness}%</span>
                <span className="min-w-0 break-words text-sm text-muted">{j.summary.topBlocker ? blockerLabel(j.summary.topBlocker, t) : t("ההכנות הושלמו")}</span>
                <span className="text-sm text-muted sm:whitespace-nowrap">{formatDate(j.surgery_date, lang)} · {relativeDays(j.surgery_date, t0, lang)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {rejected.length > 0 && (
        <section aria-labelledby="h-rejected">
          <h2 id="h-rejected" className="mb-3 text-lg font-medium text-bad">{t("הוחזר לתיקון")}</h2>
          <div className="card divide-y divide-line">
            {rejected.map((i) => (
              <Link key={i.task.id} href={`/clinic/patients/${journeyByPatient.get(i.patientId)}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 link-row">
                <span className="min-w-0 break-words font-medium">{i.patientName}</span>
                <span className="text-sm text-bad">{relativeDays(i.task.dueDate, t0, lang)}</span>
                <span className="col-span-2 min-w-0 break-words text-sm text-muted">{i.task.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
