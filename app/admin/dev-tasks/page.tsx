import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AddSubject } from "./add-subject";
import { SubjectCard, type DevTask } from "./subject-card";

export const dynamic = "force-dynamic";

const FILTERS = [
  ["all", "הכול"],
  ["doing", "בתהליך"],
  ["todo", "לביצוע"],
  ["done", "הושלם"],
] as const;
type Filter = (typeof FILTERS)[number][0];

export default async function DevTasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const active: Filter = FILTERS.some(([k]) => k === status) ? (status as Filter) : "all";
  const { db } = await requireAdmin();
  const [{ data: subjects, error }, { data: tasks }] = await Promise.all([
    db.from("dev_subjects").select("id, title").order("created_at"),
    db.from("dev_tasks").select("id, subject_id, title, notes, status, created_at").order("created_at"),
  ]);

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

  const all = (tasks ?? []) as (DevTask & { subject_id: string })[];
  const count = (k: Filter) => (k === "all" ? all.length : all.filter((t) => t.status === k).length);
  const open = all.filter((t) => t.status !== "done").length;

  return (
    <main>
      <p className="eyebrow">{open} פתוחות מתוך {all.length}</p>
      <h1 className="display mt-1 text-4xl">משימות פיתוח</h1>
      <p className="mt-2 text-muted">רשימת תכנון פרטית: נושאים, ומתחתם המשימות שבדרך.</p>

      <nav aria-label="סינון משימות לפי סטטוס" className="chip-row mt-6 flex-wrap overflow-visible">
        {FILTERS.map(([key, label]) => (
          <Link
            key={key}
            href={key === "all" ? "/admin/dev-tasks" : `/admin/dev-tasks?status=${key}`}
            scroll={false}
            aria-current={key === active ? "page" : undefined}
            className="chip min-h-11"
          >
            {label} <span className="num text-xs">{count(key)}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-2 space-y-5">
        {active !== "all" && count(active) === 0 && (subjects ?? []).length > 0 && (
          <p className="card px-4 py-8 text-center text-muted">אין משימות בסטטוס הזה.</p>
        )}
        {(subjects ?? []).map((s) => {
          const mine = all.filter((t) => t.subject_id === s.id);
          const shown = active === "all" ? mine : mine.filter((t) => t.status === active);
          if (active !== "all" && shown.length === 0) return null;
          return <SubjectCard key={s.id} id={s.id} title={s.title} tasks={shown} doneCount={mine.filter((t) => t.status === "done").length} total={mine.length} />;
        })}
        {(subjects ?? []).length === 0 && <p className="card px-4 py-8 text-center text-muted">אין נושאים עדיין. הוסיפו את הראשון.</p>}
      </div>

      <AddSubject />
    </main>
  );
}
