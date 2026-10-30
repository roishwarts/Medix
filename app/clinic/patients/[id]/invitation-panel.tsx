"use client";

import { useT } from "@/components/i18n-provider";
import { useState, useTransition } from "react";
import { ShareLink } from "@/components/share-link";
import { createJoinLink, createPatientResetLink, type LinkResult } from "../actions";

// Shows whether the patient has joined, and lets the clinic send a join link or a password-reset link.
export function InvitationPanel({ patientId, joined }: { patientId: string; joined: boolean }) {
  const t = useT();
  const [result, setResult] = useState<LinkResult | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setResult(null);
    start(async () => setResult(await (joined ? createPatientResetLink(patientId) : createJoinLink(patientId))));
  }

  return (
    <div className="card mt-4 space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{joined ? t("המטופל הצטרף ויש לו משתמש") : t("ממתין להצטרפות")}</p>
          <p className="text-sm text-muted">
            {joined ? t("אם המטופל שכח סיסמה, אפשר לשלוח לו קישור לאיפוס.") : t("המטופל עדיין לא יצר משתמש. אפשר לשלוח לו קישור הזמנה.")}
          </p>
        </div>
        <button className="btn btn-sm min-h-11 w-full sm:min-h-9 sm:w-auto" onClick={run} disabled={pending}>
          {pending ? t("יוצר…") : joined ? t("שליחת קישור לאיפוס סיסמה") : t("שליחת הזמנה (קישור חדש)")}
        </button>
      </div>
      {result?.error && <p role="alert" className="text-sm text-bad">{result.error}</p>}
      {result?.link && result.message && (
        <ShareLink link={result.link} message={result.message} phone={result.phone} email={result.email} emailSubject={joined ? t("איפוס סיסמה") : t("הזמנה להצטרפות")} />
      )}
    </div>
  );
}
