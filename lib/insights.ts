import { addMonths, diffDays, today } from "./dates";
import type { createClient } from "./supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type RangeKey = "3m" | "6m" | "12m";
export const RANGE_MONTHS: Record<RangeKey, number> = { "3m": 3, "6m": 6, "12m": 12 };
export const isRangeKey = (v: string | undefined): v is RangeKey => v === "3m" || v === "6m" || v === "12m";

export const REASON_LABEL: Record<string, string> = {
  patient_request: "בקשת המטופל",
  medical: "שינוי במצב הרפואי",
  insurance: "ביטוח / מימון",
  clinic_schedule: "שינוי בלו״ז המרפאה",
  other: "אחר",
};
const REASON_ORDER = Object.keys(REASON_LABEL);

type JourneyRow = { id: string; surgery_date: string; created_at: string; cancelled_at: string | null; cancelled_reason: string | null; prep_completed_at: string | null };

export type StaffThroughput = { staffId: string; name: string; accepted: number; rejected: number; avgHours: number | null };

export type Insights = {
  monthStart: string;
  windowEnd: string;
  active: JourneyRow[];
  cancelled: JourneyRow[];
  cancelRate: number;
  perMonth: { month: string; count: number }[];
  reasonRows: { key: string; count: number }[];
  avgDecision: number | null;
  decisionCount: number;
  avgPrep: number | null;
  prepCount: number;
  oksBaseline: number | null;
  oksMonth3: number | null;
  oksImprovement: number | null;
  oksPaired: number;
  staff: StaffThroughput[];
} | { error: true };

// Shared by the insights page and its CSV export, so the two never drift apart. `range` picks how
// far back the window (and the monthly trend chart) goes; the window's far edge always extends one
// month past today, same as before this was made adjustable, so a surgery booked for next month
// already shows up.
export async function loadInsights(supabase: Supabase, range: RangeKey): Promise<Insights> {
  const months = RANGE_MONTHS[range];
  const monthStart = addMonths(today(), -(months - 1));
  const windowEnd = addMonths(today(), 1);

  const { data, error } = await supabase
    .from("journeys")
    .select("id, surgery_date, created_at, cancelled_at, cancelled_reason, prep_completed_at")
    .gte("surgery_date", monthStart)
    .lt("surgery_date", windowEnd);
  if (error) return { error: true };

  const rows = (data ?? []) as JourneyRow[];
  const cancelled = rows.filter((r) => r.cancelled_at);
  const active = rows.filter((r) => !r.cancelled_at);
  const cancelRate = rows.length ? Math.round((cancelled.length / rows.length) * 100) : 0;

  const monthList = Array.from({ length: months }, (_, i) => addMonths(monthStart, i));
  const perMonth = monthList.map((m) => {
    const end = addMonths(m, 1);
    return { month: m, count: active.filter((r) => r.surgery_date >= m && r.surgery_date < end).length };
  });

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

  // Staff workload: only tasks a patient actually submitted and a staff/doctor then reviewed -
  // a task someone marks done on their own (no submission) isn't "review work", so it's excluded.
  const { data: reviewed } = await supabase
    .from("journey_tasks")
    .select("reviewed_by, status, submitted_at, reviewed_at")
    .not("reviewed_by", "is", null)
    .not("submitted_at", "is", null)
    .gte("reviewed_at", monthStart)
    .lt("reviewed_at", windowEnd)
    .in("status", ["accepted", "rejected"]);
  const byStaff = new Map<string, { accepted: number; rejected: number; hours: number[] }>();
  for (const r of (reviewed ?? []) as { reviewed_by: string; status: string; submitted_at: string; reviewed_at: string }[]) {
    const entry = byStaff.get(r.reviewed_by) ?? { accepted: 0, rejected: 0, hours: [] };
    if (r.status === "accepted") entry.accepted++;
    else entry.rejected++;
    entry.hours.push((new Date(r.reviewed_at).getTime() - new Date(r.submitted_at).getTime()) / 3600000);
    byStaff.set(r.reviewed_by, entry);
  }
  const staffIds = [...byStaff.keys()];
  const { data: staffProfiles } = staffIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", staffIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((staffProfiles ?? []).map((p) => [p.id, p.full_name]));
  const staff: StaffThroughput[] = staffIds
    .map((id) => {
      const e = byStaff.get(id)!;
      return { staffId: id, name: nameById.get(id) ?? id, accepted: e.accepted, rejected: e.rejected, avgHours: avg(e.hours) };
    })
    .sort((a, b) => b.accepted + b.rejected - (a.accepted + a.rejected));

  return {
    monthStart, windowEnd, active, cancelled, cancelRate, perMonth, reasonRows,
    avgDecision, decisionCount: decisionDays.length, avgPrep, prepCount: prepDays.length,
    oksBaseline, oksMonth3, oksImprovement, oksPaired, staff,
  };
}
