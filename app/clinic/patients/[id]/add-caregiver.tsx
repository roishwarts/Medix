"use client";

import { useActionState } from "react";
import { ShareLink } from "@/components/share-link";
import { createCaregiverInviteByStaff } from "../actions";

export function AddCaregiver({ patientId }: { patientId: string }) {
  const [state, action, pending] = useActionState(createCaregiverInviteByStaff.bind(null, patientId), undefined);

  if (state?.link && state.message) {
    return (
      <div className="card mt-3 space-y-3 p-4">
        <p className="font-medium">ההזמנה ל{state.name} מוכנה</p>
        <ShareLink link={state.link} message={state.message} phone={state.phone} email={state.email} emailSubject="הזמנה לעקוב אחרי ההכנה לניתוח" />
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => window.location.reload()}>הוספת בן משפחה נוסף</button>
      </div>
    );
  }

  return (
    <details className="card mt-3">
      <summary className="cursor-pointer px-4 py-3 font-medium">הוספת בן משפחה</summary>
      <form action={action} className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cg-name" className="lbl">שם</label>
          <input id="cg-name" name="invitee_name" className="field" maxLength={60} required />
        </div>
        <div>
          <label htmlFor="cg-rel" className="lbl">קרבה</label>
          <input id="cg-rel" name="relation" className="field" maxLength={40} placeholder="בת, בן זוג, אח" required />
        </div>
        <div>
          <label htmlFor="cg-phone" className="lbl">טלפון (לוואטסאפ)</label>
          <input id="cg-phone" name="phone" className="field" dir="ltr" inputMode="tel" />
        </div>
        <div>
          <label htmlFor="cg-email" className="lbl">מייל</label>
          <input id="cg-email" name="email" type="email" className="field" dir="ltr" />
        </div>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="can_act" defaultChecked className="mt-1 size-4 accent-accent" />
          <span>לאפשר לו/ה גם לפעול בשם המטופל (להעלות מסמכים ולסמן משימות). בלי זה, צפייה בלבד.</span>
        </label>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="consent" className="mt-1 size-4 accent-accent" required />
          <span>המטופל אישר לי לשתף את פרטי ההכנה שלו עם האדם הזה.</span>
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "יוצר…" : "יצירת קישור הזמנה"}</button>
          {state?.error && <span role="alert" className="text-sm text-bad">{state.error}</span>}
        </div>
      </form>
    </details>
  );
}
