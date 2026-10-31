"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/ui";
import { mailtoUrl, smsUrl, whatsAppUrl } from "@/lib/phone";

// Sends a link the secretary already generated: WhatsApp and email open the secretary's own apps with the
// message ready to send; SMS is a fallback when a phone number is known; "copy" always works.
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
  const resetRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(resetRef.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <input readOnly dir="ltr" className="field text-sm" value={link} onFocus={(e) => e.currentTarget.select()} aria-label={t("הקישור")} />
      <div className="flex flex-wrap gap-2">
        <a className="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer" href={whatsAppUrl(phone, message)}>{t("שליחה בוואטסאפ")}</a>
        {phone && <a className="btn btn-sm" href={smsUrl(phone, message)}>{t("שליחה ב-SMS")}</a>}
        <a className="btn btn-sm" href={mailtoUrl(email, emailSubject, message)}>{t("שליחה במייל")}</a>
        <button type="button" className="btn btn-sm" onClick={copy}>
          <span aria-live="polite">{copied ? <><Icon name="check" size={14} /> {t("הועתק")}</> : t("העתקת קישור")}</span>
        </button>
      </div>
      <p className="text-xs text-muted">{t("הקישור מוצג רק עכשיו ופועל פעם אחת. לחיצה על שליחה פותחת את הוואטסאפ, ה-SMS או המייל שלך עם ההודעה מוכנה — או אפשר להעתיק ולשלוח בעצמך.")}</p>
    </div>
  );
}
