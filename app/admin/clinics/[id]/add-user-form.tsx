"use client";

import { useT } from "@/components/i18n-provider";
import { useActionState } from "react";
import { PasswordField } from "@/components/password-field";
import { addClinicUser } from "../../actions";

export function AddUserForm({ clinicId }: { clinicId: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(addClinicUser.bind(null, clinicId), undefined);
  return (
    <details className="fold mt-3">
      <summary><span className="font-medium">{t("הוספת משתמש")}</span></summary>
      <form action={action} className="card mt-2 grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <label htmlFor="full_name" className="lbl">{t("שם מלא")}</label>
          <input id="full_name" name="full_name" className="field" autoComplete="off" required />
        </div>
        <div>
          <label htmlFor="role" className="lbl">{t("תפקיד")}</label>
          <select id="role" name="role" className="field" defaultValue="staff">
            <option value="staff">{t("צוות (מזכירה, אחות)")}</option>
            <option value="doctor">{t("רופא")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="username" className="lbl">{t("שם משתמש")}</label>
          <input id="username" name="username" className="field" dir="ltr" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" aria-describedby="add-user-username-hint" required />
          <p id="add-user-username-hint" className="mt-1 text-sm text-muted">{t("3–30 תווים באנגלית, מספרים או")} <bdi dir="ltr">. _ -</bdi></p>
        </div>
        <div>
          <PasswordField label={t("סיסמה זמנית")} />
          <p className="mt-1 text-sm text-muted">{t("לפחות 8 תווים")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className="btn btn-primary min-h-11 max-sm:w-full" disabled={pending}>{pending ? t("מוסיף…") : t("הוספה")}</button>
          {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
          {state?.ok && <p role="status" className="text-sm text-ok">{state.ok}</p>}
        </div>
      </form>
    </details>
  );
}
