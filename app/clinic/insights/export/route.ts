import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { loadInsights, REASON_LABEL, isRangeKey, type RangeKey } from "@/lib/insights";

export const dynamic = "force-dynamic";

const cell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (cells: (string | number | null)[]) => cells.map(cell).join(",") + "\r\n";

// The same numbers the insights page shows, as a CSV a doctor can open in Excel or hand to an
// accountant/insurer — the page itself has no other way to get this data out.
export async function GET(req: Request) {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const range: RangeKey = (() => {
    const v = new URL(req.url).searchParams.get("range") ?? undefined;
    return isRangeKey(v) ? v : "6m";
  })();
  const data = await loadInsights(supabase, range);
  if ("error" in data) return new NextResponse("Not found", { status: 404 });

  let csv = "﻿";
  csv += row([t("סיכום"), ""]);
  csv += row([t("ניתוחים"), data.active.length]);
  csv += row([t("ביטולים"), data.cancelled.length]);
  csv += row([t("שיעור ביטולים (%)"), data.cancelRate]);
  csv += row([t("זמן מההחלטה לניתוח (ימים בממוצע)"), data.avgDecision ?? ""]);
  csv += row([t("זמן השלמת הכנה (ימים בממוצע)"), data.avgPrep ?? ""]);
  csv += "\r\n";

  csv += row([t("ניתוחים לפי חודש"), ""]);
  csv += row([t("חודש"), t("ניתוחים")]);
  for (const p of data.perMonth) csv += row([p.month, p.count]);
  csv += "\r\n";

  csv += row([t("סיבות ביטול"), ""]);
  csv += row([t("סיבה"), t("כמות")]);
  for (const r of data.reasonRows) csv += row([t(REASON_LABEL[r.key]), r.count]);
  csv += "\r\n";

  csv += row([t("עומס בדיקת משימות לפי איש צוות"), ""]);
  csv += row([t("איש צוות"), t("אושרו"), t("נדחו"), t("זמן תגובה ממוצע (שעות)")]);
  for (const s of data.staff) csv += row([s.name, s.accepted, s.rejected, s.avgHours ?? ""]);

  if (data.oksBaseline !== null || data.oksMonth3 !== null) {
    csv += "\r\n";
    csv += row([t("מדד הברך (Oxford Knee Score)"), ""]);
    csv += row([t("ממוצע לפני הניתוח"), data.oksBaseline ?? ""]);
    csv += row([t("ממוצע 3 חודשים אחרי"), data.oksMonth3 ?? ""]);
    csv += row([t("שיפור ממוצע"), data.oksImprovement ?? ""]);
    csv += row([t("מספר מטופלים עם שתי מדידות"), data.oksPaired]);
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="insights-${range}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
