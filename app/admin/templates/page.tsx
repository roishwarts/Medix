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

      <div className="card mt-6 divide-y divide-line">
        {(templates ?? []).map((t) => {
          const tasks = (t.template_tasks as { count: number }[])?.[0]?.count ?? 0;
          return (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <Link href={`/admin/templates/${t.id}`} className="font-medium hover:underline">{t.name}</Link>
                <p className="text-sm text-muted">{tasks} משימות{t.procedure ? ` · ${t.procedure}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/templates/new?from=${t.id}`} className="btn btn-sm">שכפול</Link>
                <Link href={`/admin/templates/${t.id}`} className="btn btn-sm">עריכה</Link>
              </div>
            </div>
          );
        })}
        {(templates ?? []).length === 0 && <p className="px-4 py-10 text-center text-muted">אין תבניות בסיס עדיין.</p>}
      </div>
    </main>
  );
}
