"use client";

import { useActionState, useState } from "react";
import { createInvite } from "./actions";
import { ShareLink } from "@/components/share-link";

type Errors = { name?: string; relation?: string; consent?: string };

export function InviteForm() {
  const [state, action, pending] = useActionState(createInvite, undefined);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [canAct, setCanAct] = useState(true);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  if (state?.link) {
    const text = `היי ${state.name}, הוזמנת לעקוב אחרי התהליך הרפואי שלי. ההזמנה תקפה ל-7 ימים: ${state.link}`;
    return (
      <div className="card space-y-4 p-4 sm:p-5" role="status">
        <div>
          <p className="font-medium">ההזמנה ל{state.name} ({state.relation}) מוכנה</p>
          <p className="mt-1 text-sm text-muted">שלח/י את הקישור ישירות לאדם שאת/ה רוצה לשתף. הוא תקף ל-7 ימים.</p>
        </div>
        <ShareLink link={state.link} message={text} emailSubject="הזמנה לעקוב אחרי התהליך הרפואי" />
        <a className="btn btn-quiet btn-sm" href="/family">הזמנת בן משפחה נוסף</a>
      </div>
    );
  }

  function validate(e: React.FormEvent<HTMLFormElement>) {
    const next: Errors = {};
    if (!name.trim()) next.name = "יש לכתוב את שם בן המשפחה";
    if (!relation.trim()) next.relation = "יש לכתוב קרבה (למשל: בת, בן זוג)";
    if (!consent) next.consent = "יש לאשר את השיתוף כדי להמשיך";
    setErrors(next);
    if (Object.keys(next).length) {
      e.preventDefault();
      const first = e.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]');
      (first ?? e.currentTarget.querySelector<HTMLElement>("input"))?.focus();
    }
  }

  return (
    <form action={action} onSubmit={validate} noValidate className="card space-y-5 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="invitee_name" className="lbl">שם</label>
          <input id="invitee_name" name="invitee_name" className="field" maxLength={60} autoComplete="off"
            value={name} onChange={(e) => setName(e.target.value)} required
            aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "err-name" : undefined} />
          {errors.name && <p id="err-name" className="mt-1 text-sm text-bad">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="relation" className="lbl">קרבה</label>
          <input id="relation" name="relation" className="field" placeholder="למשל: בת, בן זוג, אח" maxLength={40} autoComplete="off"
            value={relation} onChange={(e) => setRelation(e.target.value)} required
            aria-invalid={errors.relation ? true : undefined} aria-describedby={errors.relation ? "err-relation" : undefined} />
          {errors.relation && <p id="err-relation" className="mt-1 text-sm text-bad">{errors.relation}</p>}
        </div>
      </div>

      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" name="can_act" checked={canAct} onChange={(e) => setCanAct(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
        <span>
          <span className="font-medium">לאפשר גם לפעול בשמי</span>
          <span className="block text-muted">להעלות מסמכים ולסמן משימות. בלי זה, צפייה בלבד.</span>
        </span>
      </label>

      <div>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} required
            aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? "err-consent" : undefined}
            className="mt-0.5 size-5 shrink-0 accent-accent" />
          <span>אני מסכימ/ה לשתף את פרטי המסע הרפואי שלי, כולל מסמכים שהעליתי, עם האדם שיקבל את ההזמנה. אפשר להסיר גישה בכל עת.</span>
        </label>
        {errors.consent && <p id="err-consent" className="mt-1 text-sm text-bad">{errors.consent}</p>}
      </div>

      <div aria-live="polite">
        {state?.error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>}
      </div>
      <button className="btn btn-primary w-full sm:w-auto" disabled={pending} aria-busy={pending}>
        {pending ? "יוצר קישור…" : "יצירת קישור הזמנה"}
      </button>
    </form>
  );
}
