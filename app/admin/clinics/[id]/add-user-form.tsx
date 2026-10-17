"use client";

import { useActionState } from "react";
import { PasswordField } from "@/components/password-field";
import { addClinicUser } from "../../actions";

export function AddUserForm({ clinicId }: { clinicId: string }) {
  const [state, action, pending] = useActionState(addClinicUser.bind(null, clinicId), undefined);
  return (
    <details className="card mt-3">
      <summary className="cursor-pointer px-4 py-3 font-medium">הוספת משתמש</summary>
      <form action={action} className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="full_name" className="lbl">שם מלא</label>
          <input id="full_name" name="full_name" className="field" required />
        </div>
        <div>
          <label htmlFor="role" className="lbl">תפקיד</label>
          <select id="role" name="role" className="field" defaultValue="staff">
            <option value="staff">צוות (מזכירה, אחות)</option>
            <option value="doctor">רופא</option>
          </select>
        </div>
        <div>
          <label htmlFor="username" className="lbl">שם משתמש</label>
          <input id="username" name="username" className="field" dir="ltr" autoCapitalize="none" required />
        </div>
        <PasswordField label="סיסמה זמנית" />
        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "מוסיף…" : "הוספה"}</button>
          {state?.error && <span role="alert" className="text-sm text-bad">{state.error}</span>}
          {state?.ok && <span className="text-sm text-ok">{state.ok}</span>}
        </div>
      </form>
    </details>
  );
}
