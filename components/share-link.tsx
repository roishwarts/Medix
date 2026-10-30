"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { mailtoUrl, whatsAppUrl } from "@/lib/phone";

// Sends a link the secretary already generated: WhatsApp and email open the secretary's own apps with the
// message ready to send; "copy" is the fallback.
export function ShareLink({
  link,
  message,
  phone,
  email,
  emailSubject,
}: {
  link: string;
  message: string;
  phone?: string | null;
  email?: string | null;
  emailSubject: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <input readOnly dir="ltr" className="field text-sm" value={link} onFocus={(e) => e.currentTarget.select()} aria-label={t("הקישור")} />
      <div className="flex flex-wrap gap-2">
        <a className="btn btn-primary btn-sm" target="_blank" rel="noreferrer" href={whatsAppUrl(phone, message)}>{t("שליחה בוואטסאפ")}</a>
        <a className="btn btn-sm" href={mailtoUrl(email, emailSubject, message)}>{t("שליחה במייל")}</a>
        <button type="button" className="btn btn-sm" onClick={copy}>{copied ? t("הועתק") : t("העתקת קישור")}</button>
      </div>
      <p className="text-xs text-muted">{t("הקישור מוצג רק עכשיו ופועל פעם אחת. לחיצה על שליחה פותחת את הוואטסאפ או המייל שלך עם ההודעה מוכנה.")}</p>
    </div>
  );
}
