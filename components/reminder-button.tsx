"use client";

import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/ui";
import { mailtoUrl, whatsAppUrl } from "@/lib/phone";

// A free, one-click nudge: opens WhatsApp (or email, if there's no phone) with the reminder
// already written, instead of the secretary composing and sending it by hand every time. Nothing
// is sent automatically — it just removes the copy-paste step. Renders nothing when there's no way
// to reach the patient at all.
export function ReminderButton({
  phone,
  email,
  message,
  subject,
}: {
  phone?: string | null;
  email?: string | null;
  message: string;
  subject: string;
}) {
  const t = useT();
  if (!phone && !email) return null;

  const href = phone ? whatsAppUrl(phone, message) : mailtoUrl(email, subject, message);
  const label = phone ? t("שליחת תזכורת בוואטסאפ") : t("שליחת תזכורת במייל");

  return (
    <a className="btn btn-quiet btn-sm" target="_blank" rel="noopener noreferrer" href={href}>
      <Icon name="clock" size={14} />
      {t("שליחת תזכורת")}
      <span className="sr-only"> — {label}</span>
    </a>
  );
}
