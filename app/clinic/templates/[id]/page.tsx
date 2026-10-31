import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EditorTask } from "@/components/editor/types";
import { TemplateForm } from "@/components/template-form";
import { deleteTemplate, saveTemplate } from "../actions";

export async function generateMetadata() {
  return { title: (await getT())("עריכת תבנית") };
}
export const dynamic = "force-dynamic";

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const t = await getT();
  await requireProfile(["doctor"]);
  const { id } = await params;
  const { from } = await searchParams;
  const isNew = id === "new";
  const sourceId = isNew ? from : id;

  let name = "";
  let procedure = "";
  let description = "";
  let tasks: EditorTask[] = [];
  let friction: { title: string; rejected: number; total: number }[] = [];

  if (sourceId) {
    const supabase = await createClient();
    const { data: tpl } = await supabase.from("templates").select("name, procedure, description").eq("id", sourceId).maybeSingle();
    if (!tpl) notFound();
    const { data: rows } = await supabase.from("template_tasks").select("*").eq("template_id", sourceId).order("position");

    // Not a copy (duplicating starts clean) and not brand new: show where real patients are currently
    // stuck on this protocol — a task a lot of people bounce off is a signal the instructions are unclear.
    if (!isNew && rows && rows.length > 0) {
      const { data: usage } = await supabase
        .from("journey_tasks")
        .select("template_task_id, status")
        .in("template_task_id", rows.map((r) => r.id));
      const byTask = new Map<string, { rejected: number; total: number }>();
      for (const u of usage ?? []) {
        const tid = u.template_task_id as string | null;
        if (!tid) continue;
        const cur = byTask.get(tid) ?? { rejected: 0, total: 0 };
        cur.total++;
        if (u.status === "rejected") cur.rejected++;
        byTask.set(tid, cur);
      }
      friction = rows
        .map((r) => ({ title: r.title as string, ...(byTask.get(r.id) ?? { rejected: 0, total: 0 }) }))
        .filter((f) => f.rejected > 0)
        .sort((a, b) => b.rejected - a.rejected);
    }

    name = isNew ? `${tpl.name} (${t("עותק")})` : tpl.name;
    procedure = tpl.procedure ?? "";
    description = tpl.description ?? "";

    // Duplicating: give every task a fresh id and remap dependencies.
    const idMap = new Map((rows ?? []).map((r) => [r.id as string, isNew ? crypto.randomUUID() : (r.id as string)]));
    tasks = (rows ?? []).map((r) => ({
      id: idMap.get(r.id)!,
      title: r.title,
      description: r.description ?? "",
      owner: r.owner,
      due_offset_days: r.due_offset_days,
      requires_evidence: r.requires_evidence,
      requires_review: r.requires_review,
      mandatory: r.mandatory,
      kind: r.kind ?? "task",
      location: r.location ?? "",
      scheduled_local: "",
      depends_on: (r.depends_on as string[]).map((d) => idMap.get(d)).filter((d): d is string => !!d),
    }));
  }

  return (
    <main className="max-w-3xl pb-6 sm:[&_.sticky]:mx-0 sm:[&_.sticky]:rounded-2xl sm:[&_.sticky]:border sm:[&_.sticky]:px-4">
      <h1 className="display text-3xl sm:text-4xl">{isNew ? (from ? t("שכפול תבנית") : t("תבנית חדשה")) : t("עריכת תבנית")}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        {t("הגדירו את שלבי הפרוטוקול: מי אחראי על כל משימה, מתי היא מתבצעת ביחס ליום הניתוח ומה צריך להסתיים לפניה.")}
      </p>

      {friction.length > 0 && (
        <div className="mt-6 rounded-2xl bg-bad-soft p-4">
          <p className="font-medium text-bad">{t("נקודות חיכוך בתבנית הזו")}</p>
          <p className="mt-1 text-sm text-bad">
            {t("משימות שכרגע מוחזרות לתיקון אצל יותר ממטופל אחד — ייתכן שההנחיה לא ברורה מספיק.")}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {friction.map((f) => (
              <li key={f.title} className="flex items-center justify-between gap-3 text-bad">
                <span className="min-w-0 break-words">{f.title}</span>
                <span className="num shrink-0 font-medium">{t("{rejected} מתוך {total}", { rejected: f.rejected, total: f.total })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <TemplateForm
        key={id + (from ?? "")}
        templateId={isNew ? null : id}
        initial={{ name, procedure, description, tasks }}
        saveAction={saveTemplate}
        deleteAction={deleteTemplate}
        basePath="/clinic/templates"
      />
    </main>
  );
}
