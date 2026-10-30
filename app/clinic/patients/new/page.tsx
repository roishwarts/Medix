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
      <h1 className="display text-4xl">{t("מטופל חדש")}</h1>
      <p className="mt-2 text-muted">{t("אחרי היצירה תוכל לשלוח למטופל קישור אישי, והוא יצור בעצמו משתמש וסיסמה.")}</p>
      <NewPatientForm templates={templates ?? []} hospitals={options.hospitals} companies={options.companies} />
    </main>
  );
}
