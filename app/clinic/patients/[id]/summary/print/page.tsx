import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { formatDateLong } from "@/lib/dates";
import { requireProfile } from "@/lib/auth";
import { loadJourney } from "@/lib/queries";
import { blockerLabel } from "@/lib/journey";
import { HMO_LABEL, type Hmo } from "@/lib/hmo";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "../../referrals/[referralId]/print/print-button";

export const dynamic = "force-dynamic";

export default async function SummaryPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const journey = await loadJourney(id);
  if (!journey) notFound();
  const { data: patientRow } = await supabase
    .from("patients")
    .select("national_id, hmo, insurance_company, insurance_policy_number, insurance_phone, hospital")
    .eq("id", journey.patient_id)
    .maybeSingle();

  const required = journey.summary.tasks.filter((tk) => tk.mandatory && tk.preop);
  const done = required.filter((tk) => tk.state === "done").length;

  return (
    <main className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/clinic/patients/${id}`} className="text-sm text-muted hover:underline">{t("חזרה לכרטיס המטופל")}</Link>
        <PrintButton />
      </div>

      <div className="card space-y-6 p-4 sm:p-8 print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line pb-4">
          <div className="flex min-w-0 items-center gap-3">
            {profile.logo_url && <img src={profile.logo_url} alt={profile.clinic_name} className="h-12 w-auto max-w-[14rem] object-contain" />}
            <div className="min-w-0">
              {!profile.logo_url && <p className="text-lg font-semibold">{profile.clinic_name}</p>}
              {profile.clinic_address && <p className="text-sm text-muted">{profile.clinic_address}</p>}
            </div>
          </div>
          <p className="shrink-0 text-sm text-muted">{t("הודפס: {date}", { date: formatDateLong(new Date().toISOString().slice(0, 10), lang) })}</p>
        </header>

        <div>
          <h1 className="display text-2xl">{t("דף סיכום ליום הניתוח")}</h1>
          <p className="mt-1 text-muted">{journey.procedure || journey.template_name}</p>
        </div>

        <section>
          <h2 className="eyebrow mb-2">{t("פרטי המטופל")}</h2>
          <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 gap-y-2 text-sm">
            <Field label={t("שם")} value={journey.patient.full_name} />
            <Field label={t("טלפון")} value={journey.patient.phone} />
            <Field label={t("תעודת זהות")} value={patientRow?.national_id ?? null} />
            <Field label={t("קופת חולים")} value={patientRow?.hmo ? t(HMO_LABEL[patientRow.hmo as Hmo] ?? patientRow.hmo) : null} />
            <Field label={t("ביטוח פרטי")} value={patientRow?.insurance_company ?? null} />
            <Field label={t("מספר פוליסה")} value={patientRow?.insurance_policy_number ?? null} />
            <Field label={t("בית חולים")} value={patientRow?.hospital ?? null} />
          </dl>
        </section>

        <section>
          <h2 className="eyebrow mb-2">{t("פרטי הניתוח")}</h2>
          <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 gap-y-2 text-sm">
            <Field label={t("תאריך ניתוח")} value={formatDateLong(journey.surgery_date, lang)} />
            <Field label={t("פרוצדורה")} value={journey.procedure} />
          </dl>
        </section>

        <section>
          <h2 className="eyebrow mb-2">{t("סטטוס הכנה לניתוח ({done}/{total})", { done, total: required.length })}</h2>
          {required.length === 0 ? (
            <p className="text-muted">{t("אין משימות הכנה חובה במסלול זה.")}</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line text-sm">
              {required.map((tk) => (
                <li key={tk.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span>{tk.title}</span>
                  <span className={tk.state === "done" ? "font-medium text-ok" : "font-medium text-bad"}>
                    {tk.state === "done" ? t("הושלם") : t("לא הושלם")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {journey.summary.topBlocker && (
            <p className="mt-2 text-sm text-bad">{t("השלב הפתוח: {blocker}", { blocker: blockerLabel(journey.summary.topBlocker, t) })}</p>
          )}
        </section>

        {(profile.contact_name || profile.contact_phone || profile.emergency_phone) && (
          <section>
            <h2 className="eyebrow mb-2">{t("איש קשר / חירום במרפאה")}</h2>
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 gap-y-2 text-sm">
              <Field label={t("שם ותפקיד")} value={[profile.contact_name, profile.contact_role].filter(Boolean).join(" · ") || null} />
              <Field label={t("טלפון")} value={profile.contact_phone} />
              <Field label={t("טלפון חירום")} value={profile.emergency_phone} />
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
