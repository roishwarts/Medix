import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewPatientForm } from "./form";
import { Icon } from "@/components/ui";

export default async function NewPatientPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase.from("templates").select("id, name").order("name");
  return (
    <main className="max-w-xl">
      <Link href="/clinic/patients" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Icon name="arrow" size={14} /> כל המטופלים
      </Link>
      <h1 className="display text-4xl">מטופל חדש</h1>
      <p className="mt-2 text-muted">אחרי היצירה תוכל לשלוח למטופל קישור אישי, והוא יצור בעצמו משתמש וסיסמה.</p>
      <NewPatientForm templates={templates ?? []} />
    </main>
  );
}
