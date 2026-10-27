import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function tasksLabel(n: number) {
  return n === 1 ? "משימה אחת" : `${n} משימות`;
}

function usedLabel(n: number) {
  if (n === 0) return "עדיין לא בשימוש";
  if (n === 1) return "בשימוש אצל מטופל אחד";
  return `בשימוש אצל ${n} מטופלים`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Asia/Jerusalem" });
}

export default async function TemplatesPage() {
  await requireProfile(["doctor"]);
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, procedure, updated_at, template_tasks(count), journeys(count)")
    .order("updated_at", { ascending: false });
  const list = templates ?? [];

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">פרוטוקולים</p>
          <h1 className="display mt-1 text-4xl">תבניות</h1>
        </div>
        <Link href="/clinic/templates/new" className="btn btn-primary max-sm:w-full">תבנית חדשה מאפס</Link>
      </div>
      <p className="mt-2 max-w-xl text-muted">
        עריכת תבנית משפיעה על מטופלים חדשים בלבד. מטופלים שכבר התחילו לא משתנים. את המסלול של מטופל מסוים עורכים מהכרטיס שלו.
      </p>

      {list.length > 0 && (
        <p className="mt-6 text-sm font-medium text-muted">
          <span className="num">{list.length}</span> {list.length === 1 ? "תבנית" : "תבניות"}
        </p>
      )}

      {list.length === 0 ? (
        <div className="card mt-6 px-4 py-12 text-center">
          <p className="font-medium">אין תבניות עדיין.</p>
          <p className="mt-1 text-muted">אפשר להתחיל מתבנית חדשה מאפס.</p>
        </div>
      ) : (
        <ul className="card mt-2 divide-y divide-line" aria-label="רשימת תבניות">
          {list.map((t) => {
            const tasks = (t.template_tasks as { count: number }[])?.[0]?.count ?? 0;
            const used = (t.journeys as { count: number }[])?.[0]?.count ?? 0;
            return (
              <li key={t.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/clinic/templates/${t.id}`}
                    className="inline-block min-h-6 break-words font-medium hover:underline"
                  >
                    {t.name}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted">
                    <span>{tasksLabel(tasks)}</span>
                    <span>{usedLabel(used)}</span>
                    {t.updated_at && <span>עודכנה {fmtDate(t.updated_at)}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 max-sm:[&>*]:flex-1">
                  <Link
                    href={`/clinic/templates/new?from=${t.id}`}
                    className="btn btn-sm min-h-11"
                    aria-label={`שכפול התבנית ${t.name}`}
                  >
                    שכפול
                  </Link>
                  <Link
                    href={`/clinic/templates/${t.id}`}
                    className="btn btn-sm min-h-11"
                    aria-label={`עריכת התבנית ${t.name}`}
                  >
                    עריכה
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
