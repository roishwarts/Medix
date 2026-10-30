import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function BaseTemplatesPage() {
  const t = await getT();
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
          <p className="eyebrow">{t("ספריית המערכת")}</p>
          <h1 className="display mt-1 text-4xl">{t("תבניות בסיס")}</h1>
        </div>
        <Link href="/admin/templates/new" className="btn btn-primary max-sm:w-full">{t("תבנית חדשה מאפס")}</Link>
      </div>
      <p className="mt-2 max-w-xl text-muted">
        {t("תבניות שמרפאה חדשה יכולה להתחיל מהן. כל מרפאה מקבלת עותק משלה, ושינוי כאן לא משפיע על מרפאות קיימות.")}
      </p>

      <section aria-labelledby="base-templates-title" className="mt-6">
        <h2 id="base-templates-title" className="sr-only">{t("רשימת תבניות הבסיס")}</h2>
        {(templates ?? []).length > 0 && (
          <p className="mb-2 text-sm font-medium text-muted">
            <span className="num">{templates!.length}</span> {templates!.length === 1 ? t("תבנית בסיס") : t("תבניות בסיס")}
          </p>
        )}
        {(templates ?? []).length === 0 ? (
          <div className="card mt-6 px-4 py-12 text-center">
            <p className="font-medium">{t("אין תבניות בסיס עדיין.")}</p>
            <p className="mt-1 text-muted">{t("תבנית בסיס היא נקודת המוצא שמוצעת לכל מרפאה חדשה. אפשר להתחיל מתבנית חדשה מאפס.")}</p>
          </div>
        ) : (
          <ul className="card divide-y divide-line" aria-label={t("רשימת תבניות בסיס")}>
            {(templates ?? []).map((tpl) => {
              const tasks = (tpl.template_tasks as { count: number }[])?.[0]?.count ?? 0;
              const tasksLabel = tasks === 1 ? t("משימה אחת") : t("{n} משימות", { n: tasks });
              return (
                <li key={tpl.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/templates/${tpl.id}`}
                      className="block break-words font-medium hover:underline focus-visible:underline"
                    >
                      {tpl.name}
                    </Link>
                    <p className="break-words text-sm text-muted">
                      {tasks === 0 ? (
                        <span className="pill pill-warn">{t("ללא משימות")}</span>
                      ) : (
                        <span className="num">{tasksLabel}</span>
                      )}
                      {tpl.procedure ? ` · ${tpl.procedure}` : ""}
                    </p>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                    <Link href={`/admin/templates/new?from=${tpl.id}`} className="btn btn-sm min-h-11" aria-label={t("שכפול התבנית {name}", { name: tpl.name })}>{t("שכפול")}</Link>
                    <Link href={`/admin/templates/${tpl.id}`} className="btn btn-sm min-h-11" aria-label={t("עריכת התבנית {name}", { name: tpl.name })}>{t("עריכה")}</Link>
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
