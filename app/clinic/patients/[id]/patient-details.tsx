"use client";

import { useT } from "@/components/i18n-provider";
import { useActionState, useState } from "react";
import { OptionSelect } from "@/components/option-select";
import { LANGS, type Lang } from "@/lib/prefs";
import { STAGES, STAGE_LABEL, STAGE_PILL, type Stage } from "@/lib/journey";
import { updatePatientDetails } from "../actions";

const HMOS = ["clalit", "maccabi", "meuhedet", "leumit", "other"] as const;
const HMO_LABEL: Record<(typeof HMOS)[number], string> = {
  clalit: "כללית", maccabi: "מכבי", meuhedet: "מאוחדת", leumit: "לאומית", other: "אחר",
};

type Props = {
  patientId: string; name: string; phone: string; email: string; hospital: string; company: string;
  nationalId: string; hmo: string; insuranceCompany: string; insurancePolicyNumber: string; insurancePhone: string;
  hospitals: string[]; companies: string[]; autoStage: Stage; stage: Stage | null; lang: Lang; journeyEdit?: React.ReactNode;
};

export function PatientDetails({
  patientId, name, phone, email, hospital, company,
  nationalId, hmo, insuranceCompany, insurancePolicyNumber, insurancePhone,
  hospitals, companies, autoStage, stage, lang, journeyEdit,
}: Props) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof updatePatientDetails>>, formData: FormData) => {
      const res = await updatePatientDetails(patientId, prev, formData);
      if (res?.ok) setEditing(false);
      return res;
    },
    undefined,
  );

  if (editing) {
    return (
      <form action={action} className="card grid gap-3 p-4">
        <div>
          <label htmlFor="pd-name" className="lbl">{t("שם מלא")}</label>
          <input id="pd-name" name="full_name" className="field" defaultValue={name} required maxLength={80} />
        </div>
        <div>
          <label htmlFor="pd-phone" className="lbl">{t("טלפון")}</label>
          <input id="pd-phone" name="phone" type="tel" autoComplete="off" className="field" dir="ltr" inputMode="tel" defaultValue={phone} maxLength={30} />
        </div>
        <div>
          <label htmlFor="pd-email" className="lbl">{t("מייל")}</label>
          <input id="pd-email" name="email" type="email" className="field" dir="ltr" defaultValue={email} />
        </div>
        <OptionSelect id="pd-hospital" name="hospital" label={t("בית חולים")} options={hospitals} current={hospital} />
        <OptionSelect id="pd-company" name="company" label={t("חברה")} options={companies} current={company} />
        <div>
          <label htmlFor="pd-national-id" className="lbl">{t("תעודת זהות")}</label>
          <input id="pd-national-id" name="national_id" className="field num" dir="ltr" inputMode="numeric" defaultValue={nationalId} maxLength={9} />
        </div>
        <div>
          <label htmlFor="pd-hmo" className="lbl">{t("קופת חולים")}</label>
          <select id="pd-hmo" name="hmo" className="field" defaultValue={hmo}>
            <option value="">{t("לא נבחר")}</option>
            {HMOS.map((h) => <option key={h} value={h}>{t(HMO_LABEL[h])}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pd-insurance-company" className="lbl">{t("חברת ביטוח פרטי")}</label>
          <input id="pd-insurance-company" name="insurance_company" className="field" defaultValue={insuranceCompany} />
        </div>
        <div>
          <label htmlFor="pd-insurance-policy" className="lbl">{t("מספר פוליסה")}</label>
          <input id="pd-insurance-policy" name="insurance_policy_number" className="field num" dir="ltr" defaultValue={insurancePolicyNumber} />
        </div>
        <div>
          <label htmlFor="pd-insurance-phone" className="lbl">{t("טלפון לאישור ניתוחים")}</label>
          <input id="pd-insurance-phone" name="insurance_phone" type="tel" className="field" dir="ltr" inputMode="tel" defaultValue={insurancePhone} maxLength={30} />
        </div>
        <div>
          <label htmlFor="pd-stage" className="lbl">{t("סטטוס")}</label>
          <select id="pd-stage" name="stage" className="field" defaultValue={stage ?? ""}>
            <option value="">{t("אוטומטי לפי המסלול")} ({t(STAGE_LABEL[autoStage])})</option>
            {STAGES.map((s) => <option key={s} value={s}>{t(STAGE_LABEL[s])}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pd-lang" className="lbl">{t("שפת ההודעות והאפליקציה")}</label>
          <select id="pd-lang" name="lang" className="field" defaultValue={lang}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm min-h-11 sm:min-h-9" disabled={pending}>{pending ? t("שומר…") : t("שמירה")}</button>
          <button type="button" className="btn btn-quiet btn-sm min-h-11 sm:min-h-9" onClick={() => setEditing(false)}>{t("ביטול")}</button>
        </div>
      </form>
    );
  }

  const shown = stage ?? autoStage;
  const row = "flex items-center justify-between gap-4 px-4 py-2.5";
  const none = <span className="text-muted">{t("לא הוזן")}</span>;
  return (
    <div className="card divide-y divide-line text-sm">
      <div className={row}><span className="shrink-0 text-muted">{t("שם")}</span><span className="min-w-0 break-words font-medium">{name}</span></div>
      <div className={row}><span className="shrink-0 text-muted">{t("טלפון")}</span>{phone ? <a href={`tel:${phone}`} dir="ltr" className="num font-medium">{phone}</a> : none}</div>
      <div className={row}><span className="shrink-0 text-muted">{t("מייל")}</span>{email ? <a href={`mailto:${email}`} dir="ltr" className="min-w-0 break-all font-medium">{email}</a> : none}</div>
      <div className={row}><span className="shrink-0 text-muted">{t("בית חולים")}</span>{hospital ? <span className="font-medium">{hospital}</span> : <span className="text-muted">{t("לא נבחר")}</span>}</div>
      <div className={row}><span className="shrink-0 text-muted">{t("חברה")}</span>{company ? <span className="font-medium">{company}</span> : <span className="text-muted">{t("לא נבחר")}</span>}</div>
      <div className={row}><span className="shrink-0 text-muted">{t("תעודת זהות")}</span>{nationalId ? <span className="num font-medium">{nationalId}</span> : none}</div>
      <div className={row}><span className="shrink-0 text-muted">{t("קופת חולים")}</span>{hmo ? <span className="font-medium">{t(HMO_LABEL[hmo as (typeof HMOS)[number]] ?? hmo)}</span> : none}</div>
      {(insuranceCompany || insurancePolicyNumber || insurancePhone) && (
        <>
          <div className={row}><span className="shrink-0 text-muted">{t("חברת ביטוח פרטי")}</span>{insuranceCompany ? <span className="font-medium">{insuranceCompany}</span> : none}</div>
          <div className={row}><span className="shrink-0 text-muted">{t("מספר פוליסה")}</span>{insurancePolicyNumber ? <span className="num font-medium">{insurancePolicyNumber}</span> : none}</div>
          <div className={row}><span className="shrink-0 text-muted">{t("טלפון לאישור ניתוחים")}</span>{insurancePhone ? <a href={`tel:${insurancePhone}`} dir="ltr" className="num font-medium">{insurancePhone}</a> : none}</div>
        </>
      )}
      <div className={row}>
        <span className="shrink-0 text-muted">{t("סטטוס")}</span>
        <span className={`pill ${STAGE_PILL[shown]}`}>{t(STAGE_LABEL[shown])}{stage ? ` · ${t("ידני")}` : ""}</span>
      </div>
      <div className={row}><span className="shrink-0 text-muted">{t("שפה")}</span><span lang={lang} className="font-medium">{LANGS.find((l) => l.code === lang)?.label}</span></div>
      <div className="flex flex-wrap gap-2 px-3 py-2">
        <button className="btn btn-sm min-h-11 !px-3 sm:min-h-9" onClick={() => setEditing(true)}>{t("עריכת פרטים")}</button>
        {journeyEdit}
      </div>
    </div>
  );
}
