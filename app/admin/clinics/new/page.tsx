import { requireAdmin } from "@/lib/admin";
import { NewClinicForm } from "./form";

export default async function NewClinicPage() {
  const { db } = await requireAdmin();
  const { data: bases } = await db.from("templates").select("id, name").eq("is_base", true).order("name");
  return (
    <main className="mx-auto w-full max-w-xl">
      <h1 className="display text-3xl sm:text-4xl">מרפאה חדשה</h1>
      <p className="mt-2 text-muted">נוצרת מרפאה עם התחברות לרופא, ולכל תבנית שתבחר עותק משלה שהרופא יכול לערוך.</p>
      <NewClinicForm bases={bases ?? []} />
    </main>
  );
}
