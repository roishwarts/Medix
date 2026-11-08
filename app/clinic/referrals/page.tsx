import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadJourneys } from "@/lib/queries";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT())("הפניות") };
}

type Row = { id: string; patient_id: string; recipient: string; reason: string; created_at: string; result_status?: string | null };

// Every referral across the patients, newest first, with the ones still waiting for a result on top.
export default async function ReferralsPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  await requireProfile(["doctor"]);
  const supabase = await createClient();
  const [res, journeys] = await Promise.all([
    supabase.from("referrals").select("id, patient_id, recipient, reason, created_at, result_status").order("created_at", { ascending: false }).limit(100)
      .then((r) => (r.error ? supabase.from("referrals").select("id, patient_id, recipient, reason, created_at").order("created_at", { ascending: false }).limit(100) : r)),
    loadJourneys(),
  ]);
  const byPatient = new Map(journeys.map((j) => [j.patient_id, j]));
  const rows = ((res.data ?? []) as Row[]).filter((r) => byPatient.has(r.patient_id));
  const waiting = (r: Row) => (r.result_status ?? "pending") !== "received";
  const sorted = [...rows].sort((a, b) => Number(waiting(b)) - Number(waiting(a)));
  return (
    <main className="space-y-6">
      <header>
        <h1 className="display text-3xl sm:text-4xl">{t("הפניות")}</h1>
        <p className="mt-1 text-muted">{t("ההפניות שניתנו למטופלים. הפניה חדשה נכתבת בכרטיס המטופל, בלשונית הקלינית.")}</p>
      </header>
      {sorted.length === 0 ? (
        <p className="card px-4 py-12 text-center text-muted">{t("עדיין אין הפניות.")}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {sorted.map((r) => {
            const j = byPatient.get(r.patient_id)!;
            return (
              <li key={r.id}>
                <Link href={`/clinic/patients/${j.id}?tab=clinical#referrals`} className="link-row block px-4 py-3">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{j.patient.full_name}</span>
                    <span className="shrink-0 text-sm text-muted">{formatDate(r.created_at.slice(0, 10), lang)}</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span>{r.recipient}</span>
                    <span className={`pill ${waiting(r) ? "pill-warn" : "pill-ok"}`}>{waiting(r) ? t("ממתין לתשובה") : t("התשובה התקבלה")}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block break-words text-sm text-muted">{r.reason}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
