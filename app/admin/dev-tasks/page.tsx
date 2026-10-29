import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AddSubject } from "./add-subject";
import { SubjectCard, type DevTask } from "./subject-card";
import { PeopleManager, type Person } from "./people-manager";

export const dynamic = "force-dynamic";

const FILTERS = [
  ["all", "הכול"],
  ["doing", "בתהליך"],
  ["todo", "לביצוע"],
  ["done", "הושלם"],
] as const;
type Filter = (typeof FILTERS)[number][0];

export default async function DevTasksPage({ searchParams }: { searchParams: Promise<{ status?: string; who?: string }> }) {
  const { status, who: whoParam } = await searchParams;
  const active: Filter = FILTERS.some(([k]) => k === status) ? (status as Filter) : "all";
  const { db } = await requireAdmin();
  const [{ data: subjects, error }, { data: tasks }, { data: peopleRows }] = await Promise.all([
    db.from("dev_subjects").select("id, title").order("created_at"),
    // "*" so the page still works before the assignee patch is applied.
    db.from("dev_tasks").select("*").order("created_at"),
    db.from("dev_people").select("id, name").order("created_at"),
  ]);
  const people = (peopleRows ?? []) as Person[];
  const who = whoParam === "none" || people.some((p) => p.id === whoParam) ? (whoParam as string) : "all";

  if (error) {
    return (
      <main>
        <h1 className="display text-4xl">משימות פיתוח</h1>
        <p className="card mt-6 p-4 text-muted">
          הטבלאות עדיין לא קיימות. יש להריץ ב-Supabase SQL editor את הקובץ <span dir="ltr" className="num">supabase/patch-devtasks.sql</span>.
        </p>
      </main>
    );
  }

  const all = ((tasks ?? []) as (DevTask & { subject_id: string })[]).map((t) => ({ ...t, assignee_id: t.assignee_id ?? null }));
  const byWho = (t: (typeof all)[number], w: string) => w === "all" || (w === "none" ? !t.assignee_id : t.assignee_id === w);
  const byStatus = (t: (typeof all)[number], k: Filter) => k === "all" || t.status === k;
  const count = (k: Filter) => all.filter((t) => byWho(t, who) && byStatus(t, k)).length;
  const countWho = (w: string) => all.filter((t) => byWho(t, w) && byStatus(t, active)).length;
  const open = all.filter((t) => t.status !== "done").length;
  const href = (k: Filter, w: string) => {
    const p = new URLSearchParams();
    if (k !== "all") p.set("status", k);
    if (w !== "all") p.set("who", w);
    const q = p.toString();
    return q ? `/admin/dev-tasks?${q}` : "/admin/dev-tasks";
  };
  const shownTotal = all.filter((t) => byWho(t, who) && byStatus(t, active)).length;

  return (
    <main>
      <p className="eyebrow">{open} פתוחות מתוך {all.length}</p>
      <h1 className="display mt-1 text-4xl">משימות פיתוח</h1>
      <p className="mt-2 text-muted">רשימת תכנון פרטית: נושאים, ומתחתם המשימות שבדרך.</p>

      <nav aria-label="סינון משימות לפי סטטוס" className="chip-row mt-6 flex-wrap overflow-visible">
        {FILTERS.map(([key, label]) => (
          <Link
            key={key}
            href={href(key, who)}
            scroll={false}
            aria-current={key === active ? "page" : undefined}
            className="chip min-h-11"
          >
            {label} <span className="num text-xs">{count(key)}</span>
          </Link>
        ))}
      </nav>

      {people.length > 0 && (
        <nav aria-label="סינון משימות לפי אחראי" className="chip-row !mb-1 flex-wrap overflow-visible">
          {([["all", "כולם"], ...people.map((p) => [p.id, p.name] as const), ["none", "ללא אחראי"]] as const).map(([key, label]) => (
            <Link key={key} href={href(active, key)} scroll={false} aria-current={key === who ? "page" : undefined} className="chip min-h-11">
              {label} <span className="num text-xs">{countWho(key)}</span>
            </Link>
          ))}
        </nav>
      )}

      <PeopleManager people={people} />

      <div className="mt-4 space-y-5">
        {(active !== "all" || who !== "all") && shownTotal === 0 && (subjects ?? []).length > 0 && (
          <p className="card px-4 py-8 text-center text-muted">אין משימות שמתאימות לסינון.</p>
        )}
        {(subjects ?? []).map((s) => {
          const mine = all.filter((t) => t.subject_id === s.id);
          const shown = mine.filter((t) => byWho(t, who) && byStatus(t, active));
          if ((active !== "all" || who !== "all") && shown.length === 0) return null;
          return <SubjectCard key={s.id} id={s.id} title={s.title} tasks={shown} doneCount={mine.filter((t) => t.status === "done").length} total={mine.length} people={people} />;
        })}
        {(subjects ?? []).length === 0 && <p className="card px-4 py-8 text-center text-muted">אין נושאים עדיין. הוסיפו את הראשון.</p>}
      </div>

      <AddSubject />
    </main>
  );
}
