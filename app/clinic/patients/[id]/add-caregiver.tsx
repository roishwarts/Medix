"use client";

import { useT } from "@/components/i18n-provider";
import { useActionState } from "react";
import { ShareLink } from "@/components/share-link";
import { createCaregiverInviteByStaff } from "../actions";

export function AddCaregiver({ patientId }: { patientId: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(createCaregiverInviteByStaff.bind(null, patientId), undefined);

  if (state?.link && state.message) {
    return (
      <div className="card mt-3 space-y-3 p-4">
        <p className="font-medium">{t("ההזמנה ל{name} מוכנה", { name: state.name ?? "" })}</p>
        <ShareLink link={state.link} message={state.message} phone={state.phone} email={state.email} emailSubject={t("הזמנה לעקוב אחרי ההכנה לניתוח")} />
        <button type="button" className="btn btn-quiet btn-sm min-h-11 sm:min-h-9" onClick={() => window.location.reload()}>{t("הוספת בן משפחה נוסף")}</button>
      </div>
    );
  }

  return (
    <details className="card mt-3">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 py-3 font-medium">{t("הוספת בן משפחה")}</summary>
      <form action={action} className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cg-name" className="lbl">{t("שם")}</label>
          <input id="cg-name" name="invitee_name" className="field" maxLength={60} required />
        </div>
        <div>
          <label htmlFor="cg-rel" className="lbl">{t("קרבה")}</label>
          <input id="cg-rel" name="relation" className="field" maxLength={40} placeholder={t("בת, בן זוג, אח")} required />
        </div>
        <div>
          <label htmlFor="cg-phone" className="lbl">{t("טלפון (לוואטסאפ)")}</label>
          <input id="cg-phone" name="phone" type="tel" autoComplete="off" className="field" dir="ltr" inputMode="tel" />
        </div>
        <div>
          <label htmlFor="cg-email" className="lbl">{t("מייל")}</label>
          <input id="cg-email" name="email" type="email" className="field" dir="ltr" />
        </div>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="can_act" defaultChecked className="mt-0.5 size-5 shrink-0 accent-accent" />
          <span>{t("לאפשר לו/ה גם לפעול בשם המטופל (להעלות מסמכים ולסמן משימות). בלי זה, צפייה בלבד.")}</span>
        </label>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="consent" className="mt-0.5 size-5 shrink-0 accent-accent" required />
          <span>{t("המטופל אישר לי לשתף את פרטי ההכנה שלו עם האדם הזה.")}</span>
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="btn btn-primary btn-sm min-h-11 sm:min-h-9" disabled={pending}>{pending ? t("יוצר…") : t("יצירת קישור הזמנה")}</button>
          {state?.error && <span role="alert" className="text-sm text-bad">{state.error}</span>}
        </div>
      </form>
    </details>
  );
}
