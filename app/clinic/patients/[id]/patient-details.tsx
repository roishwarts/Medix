"use client";

import { useActionState, useState } from "react";
import { OptionSelect } from "@/components/option-select";
import { updatePatientDetails } from "../actions";

type Props = { patientId: string; name: string; phone: string; email: string; hospital: string; company: string; hospitals: string[]; companies: string[] };

export function PatientDetails({ patientId, name, phone, email, hospital, company, hospitals, companies }: Props) {
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
      <form action={action} className="card grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pd-name" className="lbl">שם מלא</label>
          <input id="pd-name" name="full_name" className="field" defaultValue={name} required maxLength={80} />
        </div>
        <div>
          <label htmlFor="pd-phone" className="lbl">טלפון</label>
          <input id="pd-phone" name="phone" className="field" dir="ltr" inputMode="tel" defaultValue={phone} maxLength={30} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pd-email" className="lbl">מייל</label>
          <input id="pd-email" name="email" type="email" className="field" dir="ltr" defaultValue={email} />
        </div>
        <OptionSelect id="pd-hospital" name="hospital" label="בית חולים" options={hospitals} current={hospital} />
        <OptionSelect id="pd-company" name="company" label="חברה" options={companies} current={company} />
        {state?.error && <p role="alert" className="text-sm text-bad sm:col-span-2">{state.error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "שומר…" : "שמירה"}</button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(false)}>ביטול</button>
        </div>
      </form>
    );
  }

  return (
    <div className="card divide-y divide-line">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-muted">שם</span>
        <span className="font-medium">{name}</span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-muted">טלפון</span>
        {phone ? <a href={`tel:${phone}`} dir="ltr" className="num font-medium">{phone}</a> : <span className="text-muted">לא הוזן</span>}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-muted">מייל</span>
        {email ? <a href={`mailto:${email}`} dir="ltr" className="font-medium">{email}</a> : <span className="text-muted">לא הוזן</span>}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-muted">בית חולים</span>
        {hospital ? <span className="font-medium">{hospital}</span> : <span className="text-muted">לא נבחר</span>}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-muted">חברה</span>
        {company ? <span className="font-medium">{company}</span> : <span className="text-muted">לא נבחר</span>}
      </div>
      <div className="px-4 py-2.5">
        <button className="btn btn-sm" onClick={() => setEditing(true)}>עריכת פרטים</button>
      </div>
    </div>
  );
}
