import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import type { T } from "@/lib/i18n";
import type { Lang } from "@/lib/prefs";
import { LOCALE } from "@/lib/dates";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function tasksLabel(n: number, t: T) {
  return n === 1 ? t("משימה אחת") : t("{n} משימות", { n });
}

function usedLabel(n: number, t: T) {
  if (n === 0) return t("עדיין לא בשימוש");
  if (n === 1) return t("בשימוש אצל מטופל אחד");
  return t("בשימוש אצל {n} מטופלים", { n });
}

function fmtDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "numeric", year: "numeric", timeZone: "Asia/Jerusalem" });
}

export default async function TemplatesPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
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
          <p className="eyebrow">{t("פרוטוקולים")}</p>
          <h1 className="display mt-1 text-4xl">{t("תבניות")}</h1>
        </div>
        <Link href="/clinic/templates/new" className="btn btn-primary max-sm:w-full">{t("תבנית חדשה מאפס")}</Link>
      </div>
      <p className="mt-2 max-w-xl text-muted">
        {t("עריכת תבנית משפיעה על מטופלים חדשים בלבד. מטופלים שכבר התחילו לא משתנים. את המסלול של מטופל מסוים עורכים מהכרטיס שלו.")}
      </p>

      {list.length > 0 && (
        <p className="mt-6 text-sm font-medium text-muted">
          <span className="num">{list.length}</span> {list.length === 1 ? t("תבנית") : t("תבניות")}
        </p>
      )}

      {list.length === 0 ? (
        <div className="card mt-6 px-4 py-12 text-center">
          <p className="font-medium">{t("אין תבניות עדיין.")}</p>
          <p className="mt-1 text-muted">{t("אפשר להתחיל מתבנית חדשה מאפס.")}</p>
        </div>
      ) : (
        <ul className="card mt-2 divide-y divide-line" aria-label={t("רשימת תבניות")}>
          {list.map((tpl) => {
            const tasks = (tpl.template_tasks as { count: number }[])?.[0]?.count ?? 0;
            const used = (tpl.journeys as { count: number }[])?.[0]?.count ?? 0;
            return (
              <li key={tpl.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/clinic/templates/${tpl.id}`}
                    className="inline-block min-h-6 break-words font-medium hover:underline"
                  >
                    {tpl.name}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted">
                    <span>{tasksLabel(tasks, t)}</span>
                    <span>{usedLabel(used, t)}</span>
                    {tpl.updated_at && <span>{t("עודכנה {date}", { date: fmtDate(tpl.updated_at, lang) })}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 max-sm:[&>*]:flex-1">
                  <Link
                    href={`/clinic/templates/new?from=${tpl.id}`}
                    className="btn btn-sm min-h-11"
                    aria-label={t("שכפול התבנית {name}", { name: tpl.name })}
                  >
                    {t("שכפול")}
                  </Link>
                  <Link
                    href={`/clinic/templates/${tpl.id}`}
                    className="btn btn-sm min-h-11"
                    aria-label={t("עריכת התבנית {name}", { name: tpl.name })}
                  >
                    {t("עריכה")}
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
