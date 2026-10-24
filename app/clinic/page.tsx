import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { ACTION_LABEL, OWNER_LABEL, actionItems, type ActionItem, type ActionKind } from "@/lib/journey";
import { formatDate, israelParts, relativeDays, today, diffDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { ResetRequests } from "./reset-requests";

export const dynamic = "force-dynamic";

const ORDER: ActionKind[] = ["review", "overdue", "clinic", "upcoming"];

const TABS: [ActionKind | "all", string][] = [
  ["all", "הכול"],
  ["review", "ממתין לבדיקה"],
  ["overdue", "באיחור"],
  ["clinic", "משימות לצוות"],
  ["upcoming", "מועד קרוב"],
];

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const active: ActionKind | "all" = TABS.some(([k]) => k === status) ? (status as ActionKind | "all") : "all";
  const supabase = await createClient();
  const [journeys, { data: resetRequests }] = await Promise.all([
    loadJourneys(),
    supabase
      .from("password_reset_requests")
      .select("id, full_name, role, requested_at")
      .is("handled_at", null)
      .order("requested_at"),
  ]);
  const t = today();
  const items: ActionItem[] = journeys.flatMap((j) =>
    actionItems(j.patient_id, j.patient.full_name, j.surgery_date, j.summary.tasks, t),
  );
  const journeyByPatient = new Map(journeys.map((j) => [j.patient_id, j.id]));
    const surgeriesThisWeek = journeys.filter((j) => {
    const d = diffDays(j.surgery_date, t);
    return d >= 0 && d <= 7;
  });

  return (
    <main>
      <ResetRequests
        items={(resetRequests ?? []).map((r) => ({
          id: r.id,
          name: r.full_name,
          role: r.role,
          when: israelParts(r.requested_at).date.split("-").reverse().join("."),
        }))}
      />
      <section>
        <h2 className="mb-3 flex items-baseline gap-2 text-lg font-medium">
          ניתוחים השבוע <span className="num text-sm text-muted">{surgeriesThisWeek.length}</span>
        </h2>
        {surgeriesThisWeek.length === 0 ? (
          <p className="card px-4 py-8 text-center text-muted">אין ניתוחים ב-7 הימים הקרובים.</p>
        ) : (
          <div className="card divide-y divide-line">
            {surgeriesThisWeek.map((j) => (
              <Link
                key={j.id}
                href={`/clinic/patients/${j.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 link-row sm:grid-cols-[12rem_1fr_auto]"
              >
                <span className="font-medium">{j.patient.full_name}</span>
                <span className="order-3 col-span-2 text-muted sm:order-none sm:col-span-1">
                  {j.summary.topBlocker?.label ?? "ההכנות הושלמו"}
                </span>
                <span className="text-sm text-muted">
                  <span className={`num font-medium ${j.summary.readiness === 100 ? "text-ok" : "text-bad"}`}>{j.summary.readiness}%</span>
                  {" · "}
                  {formatDate(j.surgery_date)} · {relativeDays(j.surgery_date, t)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <nav aria-label="סינון פעולות לפי סטטוס" className="chip-row mt-10">
        {TABS.map(([key, label]) => {
          const count = key === "all" ? items.length : items.filter((i) => i.kind === key).length;
          const on = key === active;
          return (
            <Link
              key={key}
              href={key === "all" ? "/clinic" : `/clinic?status=${key}`}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className="chip"
            >
              {label} <span className="num text-xs">{count}</span>
            </Link>
          );
        })}
      </nav>

      {active !== "all" && items.every((i) => i.kind !== active) && (
        <p className="card mt-6 px-4 py-8 text-center text-muted">אין פעולות בסטטוס הזה.</p>
      )}

      {ORDER.filter((kind) => active === "all" || kind === active).map((kind) => {
        const list = items
          .filter((i) => i.kind === kind)
          .sort((a, b) => (a.task.dueDate < b.task.dueDate ? -1 : 1));
        if (list.length === 0) return null;
        return (
          <section key={kind} className="mt-8">
            {active === "all" && (
              <h2 className="mb-3 flex items-baseline gap-2 text-lg font-medium">
                {ACTION_LABEL[kind]} <span className="num text-sm text-muted">{list.length}</span>
              </h2>
            )}
            <div className="card divide-y divide-line">
              {list.map((i) => (
                <Link
                  key={i.task.id}
                  href={`/clinic/patients/${journeyByPatient.get(i.patientId)}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 link-row sm:grid-cols-[12rem_1fr_auto]"
                >
                  <span className="font-medium">{i.patientName}</span>
                  <span className="order-3 col-span-2 text-muted sm:order-none sm:col-span-1">
                    {i.task.title}
                    {i.kind === "overdue" && <span className="pill pill-neutral ms-2 align-middle">אצל {OWNER_LABEL[i.task.owner]}</span>}
                  </span>
                  <span className={`text-sm ${i.kind === "overdue" ? "font-medium text-bad" : "text-muted"}`}>
                    {i.kind === "review" ? `ניתוח ${formatDate(i.surgeryDate)}` : `${formatDate(i.task.dueDate)} · ${relativeDays(i.task.dueDate, t)}`}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
