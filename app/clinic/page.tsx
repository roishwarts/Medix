import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { ACTION_LABEL, actionItems, type ActionItem, type ActionKind } from "@/lib/journey";
import { formatDate, relativeDays, today, diffDays } from "@/lib/dates";

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
  const journeys = await loadJourneys();
  const t = today();
  const items: ActionItem[] = journeys.flatMap((j) =>
    actionItems(j.patient_id, j.patient.full_name, j.surgery_date, j.summary.tasks, t),
  );
  const journeyByPatient = new Map(journeys.map((j) => [j.patient_id, j.id]));
  const patientsNeedingAction = new Set(items.map((i) => i.patientId)).size;
  const surgeriesThisWeek = journeys.filter((j) => {
    const d = diffDays(j.surgery_date, t);
    return d >= 0 && d <= 7;
  });

  return (
    <main>
      <p className="eyebrow">7 הימים הקרובים</p>
      <h1 className="display mt-1 text-4xl">פעולות השבוע</h1>
      <p className="mt-2 text-muted">
        {items.length === 0
          ? "אין פעולות פתוחות. אפשר לנשום."
          : `${patientsNeedingAction} מטופלים דורשים טיפול · ${items.length} פעולות`}
      </p>

      {surgeriesThisWeek.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow mb-2">ניתוחים השבוע</h2>
          <div className="flex flex-wrap gap-2">
            {surgeriesThisWeek.map((j) => (
              <Link key={j.id} href={`/clinic/patients/${j.id}`} className="card flex items-center gap-3 px-3 py-2 text-sm hover:border-line-strong">
                <span className="font-medium">{j.patient.full_name}</span>
                <span className="text-muted">{formatDate(j.surgery_date)}</span>
                <span className={`num font-medium ${j.summary.readiness === 100 ? "text-ok" : "text-bad"}`}>{j.summary.readiness}%</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav aria-label="סינון פעולות לפי סטטוס" className="mt-10 flex gap-6 overflow-x-auto border-b border-line">
        {TABS.map(([key, label]) => {
          const count = key === "all" ? items.length : items.filter((i) => i.kind === key).length;
          const on = key === active;
          return (
            <Link
              key={key}
              href={key === "all" ? "/clinic" : `/clinic?status=${key}`}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 py-3 text-[15px] ${on ? "border-accent font-medium text-accent" : "border-transparent text-muted hover:text-ink"}`}
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
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 hover:bg-paper sm:grid-cols-[12rem_1fr_auto]"
                >
                  <span className="font-medium">{i.patientName}</span>
                  <span className="order-3 col-span-2 text-muted sm:order-none sm:col-span-1">{i.task.title}</span>
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
