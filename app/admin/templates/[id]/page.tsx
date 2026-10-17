import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import type { EditorTask } from "@/components/editor/types";
import { Icon } from "@/components/ui";
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
    name = isNew ? `${tpl.name} (עותק)` : tpl.name;
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
    <main className="max-w-3xl">
      <Link href="/admin/templates" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Icon name="arrow" size={14} /> כל תבניות הבסיס
      </Link>
      <p className="eyebrow">תבנית בסיס</p>
      <h1 className="display mt-1 text-4xl">{isNew ? (from ? "שכפול תבנית" : "תבנית חדשה") : "עריכת תבנית"}</h1>
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
