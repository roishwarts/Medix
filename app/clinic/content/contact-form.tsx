"use client";

import { useT } from "@/components/i18n-provider";
import { useId, useState, useTransition } from "react";
import { saveClinicContact } from "./actions";

type Initial = {
  contact_name: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  emergency_phone: string | null;
  office_hours: string | null;
  address: string | null;
};

export function ContactForm({ initial }: { initial: Initial }) {
  const t = useT();
  const [name, setName] = useState(initial.contact_name ?? "");
  const [role, setRole] = useState(initial.contact_role ?? "");
  const [phone, setPhone] = useState(initial.contact_phone ?? "");
  const [emergency, setEmergency] = useState(initial.emergency_phone ?? "");
  const [hours, setHours] = useState(initial.office_hours ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const nameId = useId();
  const roleId = useId();
  const phoneId = useId();
  const emergencyId = useId();
  const hoursId = useId();
  const addressId = useId();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveClinicContact(name, role, phone, emergency, hours, address);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="font-semibold">{t("הצוות שלי")}</h3>
      <p className="mt-1 text-sm text-muted">
        {t("איש הקשר הראשי שמוצג למטופל: שם, טלפון וטלפון חירום נפרד. מופיע בעמוד המסלול של כל מטופלי המרפאה, כולל כפתור חיוג וכפתור WhatsApp.")}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={nameId} className="lbl">{t("שם איש הקשר")}</label>
          <input id={nameId} className="field" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} maxLength={80} autoComplete="off" placeholder={t("למשל: מיכל לוי")} />
        </div>
        <div>
          <label htmlFor={roleId} className="lbl">{t("תפקיד")}</label>
          <input id={roleId} className="field" value={role} onChange={(e) => { setRole(e.target.value); setSaved(false); }} maxLength={60} autoComplete="off" placeholder={t("למשל: מזכירת המרפאה")} />
        </div>
        <div>
          <label htmlFor={phoneId} className="lbl">{t("טלפון")}</label>
          <input id={phoneId} className="field" dir="ltr" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} autoComplete="off" placeholder="050-1234567" />
        </div>
        <div>
          <label htmlFor={emergencyId} className="lbl">{t("טלפון למקרה חירום")}</label>
          <input id={emergencyId} className="field" dir="ltr" value={emergency} onChange={(e) => { setEmergency(e.target.value); setSaved(false); }} autoComplete="off" placeholder={t("050-1234567 (לא חובה)")} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={hoursId} className="lbl">{t("שעות מענה")}</label>
          <input id={hoursId} className="field" value={hours} onChange={(e) => { setHours(e.target.value); setSaved(false); }} maxLength={120} autoComplete="off" placeholder={t("למשל: א׳-ה׳ 9:00-17:00")} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={addressId} className="lbl">{t("כתובת המרפאה")}</label>
          <input id={addressId} className="field" value={address} onChange={(e) => { setAddress(e.target.value); setSaved(false); }} maxLength={200} autoComplete="off" placeholder={t("למשל: רחוב הרצל 1, תל אביב")} />
          <p className="mt-1.5 text-sm text-muted">{t("מוצגת למטופל עם קישור ניווט בתורים שנקבעים במרפאה.")}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={pending}>
          {pending ? t("שומר…") : t("שמירה")}
        </button>
        {saved && <span role="status" className="text-sm text-ok">{t("נשמר")}</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
