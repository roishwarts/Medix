import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function BaseTemplatesPage() {
  const { db } = await requireAdmin();
  const { data: templates } = await db
    .from("templates")
    .select("id, name, procedure, template_tasks(count)")
    .eq("is_base", true)
    .order("name");

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">ספריית המערכת</p>
          <h1 className="display mt-1 text-4xl">תבניות בסיס</h1>
        </div>
        <Link href="/admin/templates/new" className="btn btn-primary">תבנית חדשה מאפס</Link>
      </div>
      <p className="mt-2 max-w-xl text-muted">
        תבניות שמרפאה חדשה יכולה להתחיל מהן. כל מרפאה מקבלת עותק משלה, ושינוי כאן לא משפיע על מרפאות קיימות.
      </p>

      <section aria-labelledby="base-templates-title" className="mt-6">
        <h2 id="base-templates-title" className="sr-only">רשימת תבניות הבסיס</h2>
        {(templates ?? []).length === 0 ? (
          <div className="card px-4 py-10 text-center text-muted">אין תבניות בסיס עדיין.</div>
        ) : (
          <ul className="card divide-y divide-line">
            {(templates ?? []).map((t) => {
              const tasks = (t.template_tasks as { count: number }[])?.[0]?.count ?? 0;
              const tasksLabel = tasks === 1 ? "משימה אחת" : `${tasks} משימות`;
              return (
                <li key={t.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/templates/${t.id}`}
                      className="block break-words font-medium hover:underline focus-visible:underline"
                    >
                      {t.name}
                    </Link>
                    <p className="break-words text-sm text-muted">
                      <span className="num">{tasksLabel}</span>
                      {t.procedure ? ` · ${t.procedure}` : ""}
                    </p>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                    <Link href={`/admin/templates/new?from=${t.id}`} className="btn btn-sm min-h-11" aria-label={`שכפול התבנית ${t.name}`}>שכפול</Link>
                    <Link href={`/admin/templates/${t.id}`} className="btn btn-sm min-h-11" aria-label={`עריכת התבנית ${t.name}`}>עריכה</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
