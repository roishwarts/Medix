import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EditorTask } from "@/components/editor/types";
import { Icon } from "@/components/ui";
import { TemplateForm } from "./form";

export const dynamic = "force-dynamic";

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
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
    name = isNew ? `${tpl.name} (עותק)` : tpl.name;
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
      depends_on: (r.depends_on as string[]).map((d) => idMap.get(d)).filter((d): d is string => !!d),
    }));
  }

  return (
    <main className="max-w-3xl">
      <Link href="/clinic/templates" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Icon name="arrow" size={14} /> כל התבניות
      </Link>
      <h1 className="display text-4xl">{isNew ? (from ? "שכפול תבנית" : "תבנית חדשה") : "עריכת תבנית"}</h1>
      <TemplateForm
        key={id + (from ?? "")}
        templateId={isNew ? null : id}
        initial={{ name, procedure, description, tasks }}
      />
    </main>
  );
}
