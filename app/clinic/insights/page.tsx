import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addMonths, diffDays, monthTitle, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  patient_request: "בקשת המטופל",
  medical: "שינוי במצב הרפואי",
  insurance: "ביטוח / מימון",
  clinic_schedule: "שינוי בלו״ז המרפאה",
  other: "אחר",
};
const REASON_ORDER = Object.keys(REASON_LABEL);

type Row = { id: string; surgery_date: string; created_at: string; cancelled_at: string | null; cancelled_reason: string | null; prep_completed_at: string | null };

export default async function InsightsPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();

  const monthStart = addMonths(today(), -5);
  const windowEnd = addMonths(today(), 1);
  const { data, error } = await supabase
    .from("journeys")
    .select("id, surgery_date, created_at, cancelled_at, cancelled_reason, prep_completed_at")
    .gte("surgery_date", monthStart)
    .lt("surgery_date", windowEnd);

  if (error) {
    return (
      <main className="max-w-2xl">
        <h1 className="display text-4xl">{t("תובנות ניהול")}</h1>
        <div className="card mt-6 px-4 py-12 text-center">
          <p className="font-medium">{t("הדשבורד דורש תוספת למסד הנתונים.")}</p>
          <p className="mt-1 text-muted">{t("יש להריץ את supabase/patch-outcomes.sql ולנסות שוב.")}</p>
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as Row[];
  const cancelled = rows.filter((r) => r.cancelled_at);
  const active = rows.filter((r) => !r.cancelled_at);
  const cancelRate = rows.length ? Math.round((cancelled.length / rows.length) * 100) : 0;

  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthStart, i));
  const perMonth = months.map((m) => {
    const end = addMonths(m, 1);
    return { month: m, count: active.filter((r) => r.surgery_date >= m && r.surgery_date < end).length };
  });
  const maxCount = Math.max(1, ...perMonth.map((p) => p.count));

  const reasonCounts = new Map<string, number>();
  for (const r of cancelled) {
    const key = r.cancelled_reason ?? "other";
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }
  const reasonRows = REASON_ORDER.map((key) => ({ key, count: reasonCounts.get(key) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const decisionDays = active.map((r) => diffDays(r.surgery_date, r.created_at.slice(0, 10)));
  const avgDecision = decisionDays.length ? Math.round(decisionDays.reduce((a, b) => a + b, 0) / decisionDays.length) : null;

  const prepRows = active.filter((r) => r.prep_completed_at);
  const prepDays = prepRows.map((r) => diffDays(r.prep_completed_at!.slice(0, 10), r.created_at.slice(0, 10)));
  const avgPrep = prepDays.length ? Math.round(prepDays.reduce((a, b) => a + b, 0) / prepDays.length) : null;

  // Separate, tolerant query (patch-proms.sql) — the rest of the dashboard still works without it.
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  let oksBaseline: number | null = null, oksMonth3: number | null = null, oksImprovement: number | null = null, oksPaired = 0;
  if (active.length > 0) {
    const { data: oks } = await supabase
      .from("proms_responses")
      .select("journey_id, timepoint, score")
      .eq("instrument", "oks")
      .in("journey_id", active.map((r) => r.id));
    if (oks) {
      const byJourney = new Map<string, Partial<Record<"baseline" | "month3", number>>>();
      for (const r of oks as { journey_id: string; timepoint: string; score: number | null }[]) {
        if (r.score === null || (r.timepoint !== "baseline" && r.timepoint !== "month3")) continue;
        byJourney.set(r.journey_id, { ...byJourney.get(r.journey_id), [r.timepoint]: r.score });
      }
      const all = [...byJourney.values()];
      oksBaseline = avg(all.map((v) => v.baseline).filter((n): n is number => n !== undefined));
      oksMonth3 = avg(all.map((v) => v.month3).filter((n): n is number => n !== undefined));
      const paired = all.filter((v) => v.baseline !== undefined && v.month3 !== undefined) as { baseline: number; month3: number }[];
      oksPaired = paired.length;
      oksImprovement = avg(paired.map((v) => v.month3 - v.baseline));
    }
  }

  return (
    <main className="max-w-3xl space-y-8 pb-6">
      <header>
        <p className="eyebrow">{t("6 החודשים האחרונים")}</p>
        <h1 className="display mt-1 text-4xl">{t("תובנות ניהול")}</h1>
      </header>

      <section className="card grid grid-cols-3 gap-3 p-5 text-center">
        <div>
          <p className="num display text-3xl">{active.length}</p>
          <p className="text-sm text-muted">{t("ניתוחים")}</p>
        </div>
        <div>
          <p className={`num display text-3xl ${cancelled.length > 0 ? "text-bad" : ""}`}>{cancelled.length}</p>
          <p className="text-sm text-muted">{t("ביטולים")}</p>
        </div>
        <div>
          <p className={`num display text-3xl ${cancelRate > 10 ? "text-bad" : ""}`}>{cancelRate}%</p>
          <p className="text-sm text-muted">{t("שיעור ביטולים")}</p>
        </div>
      </section>

      <section aria-labelledby="h-months">
        <h2 id="h-months" className="mb-3 text-lg font-medium">{t("ניתוחים לפי חודש")}</h2>
        <div className="card space-y-3 p-5">
          {perMonth.map((p) => (
            <div key={p.month} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-muted">{monthTitle(p.month, lang)}</span>
              <div className="h-5 min-w-0 flex-1 overflow-hidden rounded-full bg-paper">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(p.count / maxCount) * 100}%` }} />
              </div>
              <span className="num w-6 shrink-0 text-end text-sm font-medium">{p.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="h-reasons">
        <h2 id="h-reasons" className="mb-3 text-lg font-medium">{t("סיבות ביטול")}</h2>
        {reasonRows.length === 0 ? (
          <p className="card px-4 py-8 text-center text-muted">{t("לא נרשמו ביטולים בתקופה הזו.")}</p>
        ) : (
          <div className="card divide-y divide-line">
            {reasonRows.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-4 px-4 py-3">
                <span>{t(REASON_LABEL[r.key])}</span>
                <span className="num text-sm font-medium text-muted">
                  {r.count} ({Math.round((r.count / cancelled.length) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm text-muted">{t("זמן מההחלטה לניתוח")}</p>
          <p className="num display mt-1 text-3xl">{avgDecision !== null ? t("{n} ימים בממוצע", { n: avgDecision }) : t("אין מידע עדיין")}</p>
          <p className="mt-1 text-xs text-muted">{t("מרישום המטופל במערכת ועד תאריך הניתוח · מבוסס על {n} מטופלים", { n: decisionDays.length })}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">{t("זמן השלמת הכנה")}</p>
          <p className="num display mt-1 text-3xl">{avgPrep !== null ? t("{n} ימים בממוצע", { n: avgPrep }) : t("אין מידע עדיין")}</p>
          <p className="mt-1 text-xs text-muted">{t("מתחילת המסלול ועד שהמוכנות הגיעה ל-100% · מבוסס על {n} מטופלים", { n: prepDays.length })}</p>
        </div>
      </section>
      {(oksBaseline !== null || oksMonth3 !== null) && (
        <section aria-labelledby="h-oks">
          <h2 id="h-oks" className="mb-3 text-lg font-medium">{t("מדד הברך (Oxford Knee Score)")}</h2>
          <div className="card grid grid-cols-3 gap-3 p-5 text-center">
            <div>
              <p className="num display text-3xl">{oksBaseline ?? "—"}</p>
              <p className="text-sm text-muted">{t("ממוצע לפני הניתוח")}</p>
            </div>
            <div>
              <p className="num display text-3xl">{oksMonth3 ?? "—"}</p>
              <p className="text-sm text-muted">{t("ממוצע 3 חודשים אחרי")}</p>
            </div>
            <div>
              <p className={`num display text-3xl ${oksImprovement !== null && oksImprovement > 0 ? "text-ok" : ""}`}>
                {oksImprovement !== null ? (oksImprovement > 0 ? `+${oksImprovement}` : oksImprovement) : "—"}
              </p>
              <p className="text-sm text-muted">{t("שיפור ממוצע")}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">{t("מתוך {n} מטופלים עם שתי מדידות (0–48, ככל שגבוה יותר כך טוב יותר)", { n: oksPaired })}</p>
        </section>
      )}
    </main>
  );
}
