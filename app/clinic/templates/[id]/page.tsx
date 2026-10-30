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

  if (sourceId) {
    const supabase = await createClient();
    const { data: tpl } = await supabase.from("templates").select("name, procedure, description").eq("id", sourceId).maybeSingle();
    if (!tpl) notFound();
    const { data: rows } = await supabase.from("template_tasks").select("*").eq("template_id", sourceId).order("position");
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
