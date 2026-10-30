import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { loadJourneys } from "@/lib/queries";
import { ACTION_LABEL, ownerLabel, actionItems, type ActionItem, type ActionKind } from "@/lib/journey";
import { formatDate, israelParts, relativeDays, today } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { ResetRequests } from "../reset-requests";

export const dynamic = "force-dynamic";

const ORDER: ActionKind[] = ["review", "overdue", "clinic", "upcoming"];

const TABS: [ActionKind | "all", string][] = [
  ["all", "הכול"],
  ["review", "ממתין לבדיקה"],
  ["overdue", "באיחור"],
  ["clinic", "משימות לצוות"],
  ["upcoming", "משימות למטופלים"],
];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
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
  const t0 = today();
  const items: ActionItem[] = journeys.flatMap((j) =>
    actionItems(j.patient_id, j.patient.full_name, j.surgery_date, j.summary.tasks, t0),
  );
  const journeyByPatient = new Map(journeys.map((j) => [j.patient_id, j.id]));

  return (
    <main className="space-y-10">
      <header>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="display text-3xl sm:text-4xl">{t("משימות")}</h1>
        <nav aria-label={t("סינון פעולות לפי סטטוס")} className="chip-row !mb-0 flex-1 !flex-wrap justify-center !overflow-visible">
          {TABS.map(([key, label]) => {
            const count = key === "all" ? items.length : items.filter((i) => i.kind === key).length;
            const on = key === active;
            return (
              <Link
                key={key}
                href={key === "all" ? "/clinic/tasks" : `/clinic/tasks?status=${key}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`chip min-h-11 ${count === 0 && !on ? "opacity-70" : ""}`}
              >
                {t(label)} <span className="num text-xs">{count}</span><span className="sr-only"> {t("פעולות")}</span>
              </Link>
            );
          })}
        </nav>
        </div>
        <p className="mt-2 text-muted">{t("כל מה שמחכה לטיפול הצוות: בדיקות, איחורים ומשימות קרובות.")}</p>
      </header>
      <ResetRequests
        items={(resetRequests ?? []).map((r) => ({
          id: r.id,
          name: r.full_name,
          role: r.role,
          when: israelParts(r.requested_at).date.split("-").reverse().join("."),
        }))}
      />
      {active !== "all" && items.every((i) => i.kind !== active) && (
        <p role="status" className="card px-4 py-8 text-center text-muted">{t("אין פעולות בסטטוס הזה.")}</p>
      )}

      {ORDER.filter((kind) => active === "all" || kind === active).map((kind) => {
        const list = items
          .filter((i) => i.kind === kind)
          .sort((a, b) => (a.task.dueDate < b.task.dueDate ? -1 : 1));
        if (list.length === 0) return null;
        return (
          <section key={kind} aria-label={active === "all" ? undefined : t(ACTION_LABEL[kind])} aria-labelledby={active === "all" ? `h-${kind}` : undefined}>
            {active === "all" && (
              <h2 id={`h-${kind}`} className="mb-3 flex items-baseline gap-2 text-lg font-medium">
                {t(ACTION_LABEL[kind])} <span className="num text-sm text-muted">{list.length}</span>
              </h2>
            )}
            <div className="card divide-y divide-line">
              {list.map((i) => (
                <Link
                  key={i.task.id}
                  href={`/clinic/patients/${journeyByPatient.get(i.patientId)}`}
                  className="grid grid-cols-1 items-center min-[420px]:grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 px-4 py-3 link-row sm:grid-cols-[12rem_1fr_auto]"
                >
                  <span className="min-w-0 break-words font-medium">{i.patientName}</span>
                  <span className="order-3 min-[420px]:col-span-2 min-w-0 break-words text-muted sm:order-none sm:col-span-1">
                    {i.task.title}
                    {i.kind === "overdue" && <span className="pill pill-neutral ms-2 align-middle">{t("אצל {owner}", { owner: ownerLabel(i.task.owner, t) })}</span>}
                  </span>
                  <span className={`text-sm sm:whitespace-nowrap ${i.kind === "overdue" ? "font-medium text-bad" : "text-muted"}`}>
                    {i.kind === "review" ? t("ניתוח {date}", { date: formatDate(i.surgeryDate, lang) }) : `${formatDate(i.task.dueDate, lang)} · ${relativeDays(i.task.dueDate, t0, lang)}`}
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
