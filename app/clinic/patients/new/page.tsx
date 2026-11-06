import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { NewPatientForm } from "./form";
import { getClinicOptions } from "@/lib/clinic-options";

export default async function NewPatientPage() {
  const t = await getT();
  const supabase = await createClient();
  const { data: templates } = await supabase.from("templates").select("id, name").order("name");
  const options = await getClinicOptions();
  return (
    <main className="max-w-xl">
      <p className="eyebrow">{t("מטופלים")}</p>
      <h1 className="display mt-1 text-4xl">{t("מטופל חדש")}</h1>
      <p className="mt-2 text-muted">{t("אחרי היצירה תוכל לשלוח למטופל קישור אישי, והוא יצור בעצמו משתמש וסיסמה.")}</p>
      <NewPatientForm templates={templates ?? []} hospitals={options.hospitals} companies={options.companies} />
      {(!templates || templates.length === 0) && (
        <p className="mt-4 text-sm text-muted">
          {t("עדיין אין תבניות הכנה לניתוח. אפשר להוסיף מטופל למעקב, או ליצור קודם")} <Link href="/clinic/templates/new" className="text-accent underline-offset-4 hover:underline">{t("תבנית חדשה מאפס")}</Link>.
        </p>
      )}
    </main>
  );
}
