"use client";

import { useActionState, useState } from "react";
import { createInvite } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState(createInvite, undefined);
  const [copied, setCopied] = useState(false);

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (state?.link) {
    const text = `היי ${state.name}, הוזמנת לעקוב אחרי התהליך הרפואי שלי. ההזמנה תקפה ל-7 ימים: ${state.link}`;
    return (
      <div className="card space-y-4 p-4">
        <p className="font-medium">ההזמנה ל{state.name} ({state.relation}) מוכנה</p>
        <p className="text-sm text-muted">הקישור מוצג רק עכשיו. שלח/י אותו ישירות לאדם שאת/ה רוצה לשתף. הוא תקף ל-7 ימים ופועל פעם אחת.</p>
        <input readOnly dir="ltr" className="field text-sm" value={state.link} onFocus={(e) => e.currentTarget.select()} />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary btn-sm" onClick={() => copy(state.link!)}>{copied ? "הועתק" : "העתקת קישור"}</button>
          <a className="btn btn-sm" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>שליחה בוואטסאפ</a>
          <a className="btn btn-quiet btn-sm" href="/family">הזמנה נוספת</a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-4">
      <div>
        <label htmlFor="invitee_name" className="lbl">שם</label>
        <input id="invitee_name" name="invitee_name" className="field" maxLength={60} autoComplete="off" required />
      </div>
      <div>
        <label htmlFor="relation" className="lbl">קרבה</label>
        <input id="relation" name="relation" className="field" placeholder="למשל: בת, בן זוג, אח" maxLength={40} required />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="can_act" defaultChecked className="mt-1 size-4 accent-accent" />
        <span>לאפשר לו/ה גם לפעול בשמי: להעלות מסמכים ולסמן משימות. בלי זה, צפייה בלבד.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-1 size-4 accent-accent" required />
        <span>אני מסכימ/ה לשתף את פרטי המסע הרפואי שלי, כולל מסמכים שהעליתי, עם האדם שיקבל את ההזמנה. אפשר להסיר גישה בכל עת.</span>
      </label>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "יוצר…" : "יצירת קישור הזמנה"}</button>
    </form>
  );
}
