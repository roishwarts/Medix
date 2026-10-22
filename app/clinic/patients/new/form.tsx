"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ShareLink } from "@/components/share-link";
import { createPatient } from "../actions";

export function NewPatientForm({ templates }: { templates: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createPatient, undefined);
  const created = state?.created;

  if (created) {
    return (
      <div className="mt-8 space-y-6">
        <div className="card space-y-4 p-5">
          <div>
            <p className="eyebrow">המטופל נוצר</p>
            <h2 className="display mt-1 text-2xl">{created.patientName}</h2>
            <p className="mt-1 text-muted">עכשיו אפשר לשלוח לו הזמנה ליצירת משתמש.</p>
          </div>
          {created.link && created.message ? (
            <ShareLink link={created.link} message={created.message} phone={created.phone} email={created.email} emailSubject="הזמנה להצטרפות" />
          ) : (
            <p role="alert" className="text-sm text-bad">{created.linkError ?? "לא ניתן ליצור קישור"}. אפשר ליצור קישור מכרטיס המטופל.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/clinic/patients/${created.journeyId}`} className="btn btn-primary">מעבר לכרטיס המטופל</Link>
          <a href="/clinic/patients/new" className="btn">מטופל נוסף</a>
        </div>
        <p className="text-sm text-muted">בכרטיס המטופל אפשר להוסיף בני משפחה ולשלוח להם הזמנה.</p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="full_name" className="lbl">שם מלא</label>
        <input id="full_name" name="full_name" className="field" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="lbl">טלפון (לשליחה בוואטסאפ)</label>
          <input id="phone" name="phone" className="field" dir="ltr" inputMode="tel" placeholder="050-0000000" required />
        </div>
        <div>
          <label htmlFor="email" className="lbl">מייל (לא חובה)</label>
          <input id="email" name="email" type="email" className="field" dir="ltr" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="template_id" className="lbl">תבנית</label>
          <select id="template_id" name="template_id" className="field" required>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="surgery_date" className="lbl">תאריך ניתוח</label>
          <input id="surgery_date" name="surgery_date" type="date" className="field" required />
        </div>
      </div>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "יוצר…" : "יצירת מטופל והכנת הזמנה"}</button>
    </form>
  );
}
