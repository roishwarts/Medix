"use client";

import { useActionState, useState } from "react";
import { createInvite } from "./actions";
import { ShareLink } from "@/components/share-link";
import { Icon } from "@/components/ui";
import { useT } from "@/components/i18n-provider";

type Errors = { name?: string; relation?: string; consent?: string };

export function InviteForm() {
  const t = useT();
  const [state, action, pending] = useActionState(createInvite, undefined);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [canAct, setCanAct] = useState(true);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  if (state?.link) {
    const text = t("היי {name}, הוזמנת לעקוב אחרי התהליך הרפואי שלי. ההזמנה תקפה ל־7 ימים: {link}", { name: state.name ?? "", link: state.link });
    return (
      <div className="card space-y-4 p-4 sm:p-5" role="status">
        <div>
          <p className="font-medium">{t("ההזמנה ל{name} ({relation}) מוכנה", { name: state.name ?? "", relation: state.relation ?? "" })}</p>
          <p className="mt-1 text-sm text-muted">{t("שלח/י את הקישור ישירות לאדם שאת/ה רוצה לשתף. הוא תקף ל־7 ימים.")}</p>
        </div>
        <ShareLink link={state.link} message={text} phone={phone || undefined} emailSubject={t("הזמנה לעקוב אחרי התהליך הרפואי")} />
        <a className="btn btn-quiet btn-sm" href="/family">{t("הזמנת בן משפחה נוסף")}</a>
      </div>
    );
  }

  function validate(e: React.FormEvent<HTMLFormElement>) {
    const next: Errors = {};
    if (!name.trim()) next.name = t("יש לכתוב את שם בן המשפחה");
    if (!relation.trim()) next.relation = t("יש לכתוב קרבה (למשל: בת, בן זוג)");
    if (!consent) next.consent = t("יש לאשר את השיתוף כדי להמשיך");
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
          <label htmlFor="invitee_name" className="lbl">{t("שם")}</label>
          <input id="invitee_name" name="invitee_name" className="field" maxLength={60} autoComplete="off"
            value={name} onChange={(e) => setName(e.target.value)} required
            aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "err-name" : undefined} />
          {errors.name && <p id="err-name" className="mt-1 text-sm text-bad">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="relation" className="lbl">{t("קרבה")}</label>
          <input id="relation" name="relation" className="field" placeholder={t("למשל: בת, בן זוג, אח")} maxLength={40} autoComplete="off"
            value={relation} onChange={(e) => setRelation(e.target.value)} required
            aria-invalid={errors.relation ? true : undefined} aria-describedby={errors.relation ? "err-relation" : undefined} />
          {errors.relation && <p id="err-relation" className="mt-1 text-sm text-bad">{errors.relation}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="family_phone" className="lbl">{t("טלפון (לא חובה)")}</label>
        <input id="family_phone" name="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="off" className="field"
          placeholder={t("050-1234567")} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <p className="mt-1 text-xs text-muted">{t("אם ממלאים טלפון, אפשר לשלוח את ההזמנה ישירות לוואטסאפ או ל-SMS שלו/שלה בלחיצה אחת.")}</p>
      </div>

      <fieldset>
        <legend className="lbl">{t("מה ההרשאה תאפשר")}</legend>
        <input type="hidden" name="can_act" value={canAct ? "on" : ""} />
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" aria-pressed={!canAct} onClick={() => setCanAct(false)}
            className={`flex min-h-11 items-start gap-2 rounded-2xl border p-3 text-start text-sm transition-colors ${!canAct ? "border-accent bg-accent-soft" : "border-line text-muted hover:bg-[var(--hover-tint)]"}`}>
            <Icon name="lock" />
            <span>
              <span className="block font-medium text-ink">{t("צפייה בלבד")}</span>
              <span className="block">{t("יכול/ה לראות את המסע והמסמכים, בלי לשנות דבר.")}</span>
            </span>
          </button>
          <button type="button" aria-pressed={canAct} onClick={() => setCanAct(true)}
            className={`flex min-h-11 items-start gap-2 rounded-2xl border p-3 text-start text-sm transition-colors ${canAct ? "border-accent bg-accent-soft" : "border-line text-muted hover:bg-[var(--hover-tint)]"}`}>
            <Icon name="check" />
            <span>
              <span className="block font-medium text-ink">{t("גם לפעול בשמי")}</span>
              <span className="block">{t("בנוסף לצפייה: יכול/ה גם להעלות מסמכים ולסמן משימות כבוצעו.")}</span>
            </span>
          </button>
        </div>
      </fieldset>

      <div>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} required
            aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? "err-consent" : undefined}
            className="mt-0.5 size-5 shrink-0 accent-accent" />
          <span>
            {name.trim()
              ? t("אני מסכימ/ה לשתף את פרטי המסע הרפואי שלי עם {name}, כולל מסמכים שהעליתי. אפשר להסיר את הגישה בכל עת.", { name: name.trim() })
              : t("אני מסכימ/ה לשתף את פרטי המסע הרפואי שלי, כולל מסמכים שהעליתי, עם האדם שיקבל את ההזמנה. אפשר להסיר את הגישה בכל עת.")}
          </span>
        </label>
        {errors.consent && <p id="err-consent" className="mt-1 text-sm text-bad">{errors.consent}</p>}
      </div>

      <div aria-live="polite">
        {state?.error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>}
      </div>
      <button className="btn btn-primary w-full sm:w-auto" disabled={pending} aria-busy={pending}>
        {pending ? t("יוצר קישור…") : t("יצירת קישור הזמנה")}
      </button>
    </form>
  );
}
