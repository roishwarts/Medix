import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireProfile(["doctor"]);
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, procedure, updated_at, template_tasks(count), journeys(count)")
    .order("updated_at", { ascending: false });

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">פרוטוקולים</p>
          <h1 className="display mt-1 text-4xl">תבניות</h1>
        </div>
        <Link href="/clinic/templates/new" className="btn btn-primary">תבנית חדשה מאפס</Link>
      </div>
      <p className="mt-2 max-w-xl text-muted">
        עריכת תבנית משפיעה על מטופלים חדשים בלבד. מטופלים שכבר התחילו לא משתנים. את המסלול של מטופל מסוים עורכים מהכרטיס שלו.
      </p>

      <div className="card mt-6 divide-y divide-line">
        {(templates ?? []).map((t) => {
          const tasks = (t.template_tasks as { count: number }[])?.[0]?.count ?? 0;
          const used = (t.journeys as { count: number }[])?.[0]?.count ?? 0;
          return (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <Link href={`/clinic/templates/${t.id}`} className="font-medium hover:underline">{t.name}</Link>
                <p className="text-sm text-muted">{tasks} משימות · בשימוש אצל {used} מטופלים</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/clinic/templates/new?from=${t.id}`} className="btn btn-sm">שכפול</Link>
                <Link href={`/clinic/templates/${t.id}`} className="btn btn-sm">עריכה</Link>
              </div>
            </div>
          );
        })}
        {(templates ?? []).length === 0 && <p className="px-4 py-10 text-center text-muted">אין תבניות עדיין.</p>}
      </div>
    </main>
  );
}
