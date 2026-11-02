import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthTitle } from "@/lib/dates";
import { loadInsights, REASON_LABEL, isRangeKey, type RangeKey } from "@/lib/insights";
import { InsightsRange } from "@/components/insights-range";

export const dynamic = "force-dynamic";

const RANGE_LABEL: Record<RangeKey, string> = { "3m": "3 החודשים האחרונים", "6m": "6 החודשים האחרונים", "12m": "12 החודשים האחרונים" };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const sp = await searchParams;
  const range: RangeKey = isRangeKey(sp.range) ? sp.range : "6m";
  const data = await loadInsights(supabase, range);

  if ("error" in data) {
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

  const {
    active, cancelled, cancelRate, perMonth, reasonRows,
    avgDecision, decisionCount, avgPrep, prepCount,
    oksBaseline, oksMonth3, oksImprovement, oksPaired, staff,
  } = data;
  const maxCount = Math.max(1, ...perMonth.map((p) => p.count));

  return (
    <main className="max-w-3xl space-y-8 pb-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{t(RANGE_LABEL[range])}</p>
          <h1 className="display mt-1 text-4xl">{t("תובנות ניהול")}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InsightsRange value={range} />
          <Link href={`/clinic/insights/export?range=${range}`} className="btn btn-sm">{t("ייצוא ל-CSV")}</Link>
        </div>
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
          <p className="mt-1 text-xs text-muted">{t("מרישום המטופל במערכת ועד תאריך הניתוח · מבוסס על {n} מטופלים", { n: decisionCount })}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">{t("זמן השלמת הכנה")}</p>
          <p className="num display mt-1 text-3xl">{avgPrep !== null ? t("{n} ימים בממוצע", { n: avgPrep }) : t("אין מידע עדיין")}</p>
          <p className="mt-1 text-xs text-muted">{t("מתחילת המסלול ועד שהמוכנות הגיעה ל-100% · מבוסס על {n} מטופלים", { n: prepCount })}</p>
        </div>
      </section>

      <section aria-labelledby="h-staff">
        <h2 id="h-staff" className="mb-3 text-lg font-medium">{t("עומס בדיקת משימות לפי איש צוות")}</h2>
        {staff.length === 0 ? (
          <p className="card px-4 py-8 text-center text-muted">{t("אין עדיין משימות שנבדקו בתקופה הזו.")}</p>
        ) : (
          <div className="card divide-y divide-line">
            {staff.map((s) => (
              <div key={s.staffId} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="min-w-0 break-words font-medium">{s.name}</span>
                <span className="shrink-0 text-end text-sm text-muted">
                  <span className="num font-medium text-ink">{s.accepted + s.rejected}</span> {t("נבדקו")}
                  {" · "}
                  {s.avgHours !== null ? t("זמן תגובה ממוצע {h} שעות", { h: s.avgHours }) : t("—")}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-muted">{t("רק משימות שהמטופל שלח ואיש צוות אישר/דחה, לא משימות שסומנו ישירות כבוצעו.")}</p>
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
