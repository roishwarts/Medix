"use client";

import { useActionState } from "react";
import { PasswordField } from "@/components/password-field";
import { createClinic } from "../../actions";

export function NewClinicForm({ bases }: { bases: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createClinic, undefined);
  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="clinic_name" className="lbl">שם המרפאה</label>
        <input id="clinic_name" name="clinic_name" className="field" required />
      </div>
      <fieldset className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
        <legend className="eyebrow mb-3">הרופא</legend>
        <div className="sm:col-span-2">
          <label htmlFor="physician" className="lbl">שם הרופא</label>
          <input id="physician" name="physician" className="field" placeholder="ד״ר ..." required />
        </div>
        <div>
          <label htmlFor="username" className="lbl">שם משתמש</label>
          <input id="username" name="username" className="field" dir="ltr" autoCapitalize="none" required />
        </div>
        <PasswordField label="סיסמה זמנית" />
      </fieldset>
      <fieldset className="border-t border-line pt-5">
        <legend className="eyebrow mb-3">תבניות להתחלה</legend>
        {bases.length === 0 ? (
          <p className="text-sm text-muted">אין תבניות בסיס עדיין. אפשר ליצור מרפאה בלי תבניות, ולהוסיף אחר כך.</p>
        ) : (
          <div className="space-y-2">
            {bases.map((b, i) => (
              <label key={b.id} className="flex items-center gap-2">
                <input type="checkbox" name="templates" value={b.id} defaultChecked={i === 0} className="size-4 accent-accent" />
                {b.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "יוצר…" : "יצירת מרפאה"}</button>
    </form>
  );
}
