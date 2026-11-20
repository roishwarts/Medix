import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadJourneys } from "@/lib/queries";
import { formatDateLong } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT())("סיכומי פגישות") };
}

// Every meeting summary across the patients, newest first. A row opens that patient's clinical tab.
export default async function SummariesPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  await requireProfile(["doctor"]);
  const supabase = await createClient();
  const [{ data: notes }, journeys] = await Promise.all([
    supabase.from("visit_notes").select("id, patient_id, occurred_at, note, follow_up").order("occurred_at", { ascending: false }).limit(100),
    loadJourneys(),
  ]);
  const byPatient = new Map(journeys.map((j) => [j.patient_id, j]));
  const rows = (notes ?? []).filter((n) => byPatient.has(n.patient_id as string));
  return (
    <main className="space-y-6">
      <header>
        <h1 className="display text-3xl sm:text-4xl">{t("סיכומי פגישות")}</h1>
        <p className="mt-1 text-muted">{t("הסיכומים האחרונים מכל המטופלים. סיכום חדש נכתב בכרטיס המטופל, בלשונית הקלינית.")}</p>
      </header>
      {rows.length === 0 ? (
        <p className="card px-4 py-12 text-center text-muted">{t("עדיין אין סיכומי פגישות.")}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {rows.map((n) => {
            const j = byPatient.get(n.patient_id as string)!;
            return (
              <li key={n.id as string}>
                <Link href={`/clinic/patients/${j.id}?tab=clinical#meeting-summaries`} className="link-row block px-4 py-3">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{j.patient.full_name}</span>
                    <span className="shrink-0 text-sm text-muted">{formatDateLong((n.occurred_at as string).slice(0, 10), lang)}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block break-words text-sm text-muted">{n.note as string}</span>
                  {n.follow_up ? <span className="mt-1 block text-sm text-accent">{t("המשך טיפול")}: {n.follow_up as string}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
