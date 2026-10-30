import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/admin";
import type { EditorTask } from "@/components/editor/types";
import { TemplateForm } from "@/components/template-form";
import { deleteBaseTemplate, saveBaseTemplate } from "../actions";

export const dynamic = "force-dynamic";

export default async function BaseTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const t = await getT();
  const { db } = await requireAdmin();
  const { id } = await params;
  const { from } = await searchParams;
  const isNew = id === "new";
  const sourceId = isNew ? from : id;

  let name = "";
  let procedure = "";
  let description = "";
  let tasks: EditorTask[] = [];

  if (sourceId) {
    const { data: tpl } = await db
      .from("templates")
      .select("name, procedure, description")
      .eq("id", sourceId)
      .eq("is_base", true)
      .maybeSingle();
    if (!tpl) notFound();
    const { data: rows } = await db.from("template_tasks").select("*").eq("template_id", sourceId).order("position");
    name = isNew ? `${tpl.name} (${(await getT())("עותק")})` : tpl.name;
    procedure = tpl.procedure ?? "";
    description = tpl.description ?? "";

    // Duplicating: fresh ids for every task, dependencies remapped.
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
      <p className="eyebrow">{t("תבנית בסיס")}</p>
      <h1 className="display mt-1 text-3xl sm:text-4xl">{isNew ? (from ? t("שכפול תבנית") : t("תבנית חדשה")) : t("עריכת תבנית")}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        {t("תבנית בסיס היא נקודת מוצא שמרפאות מעתיקות ומתאימות. הגדירו את המשימות, מי אחראי עליהן, מתי הן מתבצעות ביחס ליום הניתוח ומה צריך להסתיים לפניהן.")}
      </p>
      <TemplateForm
        key={id + (from ?? "")}
        templateId={isNew ? null : id}
        initial={{ name, procedure, description, tasks }}
        saveAction={saveBaseTemplate}
        deleteAction={deleteBaseTemplate}
        basePath="/admin/templates"
      />
    </main>
  );
}
