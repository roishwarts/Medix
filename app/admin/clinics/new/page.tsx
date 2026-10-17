import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { Icon } from "@/components/ui";
import { NewClinicForm } from "./form";

export default async function NewClinicPage() {
  const { db } = await requireAdmin();
  const { data: bases } = await db.from("templates").select("id, name").eq("is_base", true).order("name");
  return (
    <main className="max-w-xl">
      <Link href="/admin" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Icon name="arrow" size={14} /> כל המרפאות
      </Link>
      <h1 className="display text-4xl">מרפאה חדשה</h1>
      <p className="mt-2 text-muted">נוצרת מרפאה עם התחברות לרופא, ולכל תבנית שתבחר עותק משלה שהרופא יכול לערוך.</p>
      <NewClinicForm bases={bases ?? []} />
    </main>
  );
}
