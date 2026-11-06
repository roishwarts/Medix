"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/ui";
import { markReferralResultReceived, unmarkReferralResult } from "./referrals/actions";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf"];
const isAllowedType = (type: string) => type.startsWith("image/") || ALLOWED_TYPES.includes(type);

export function ReferralResult({
  referralId,
  status,
  resultName,
  resultUrl,
}: {
  referralId: string;
  status: "pending" | "received";
  resultName: string | null;
  resultUrl: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so re-selecting the same file after an error still fires onChange in every browser.
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) { setError(t("הקובץ גדול מדי (עד 10MB)")); return; }
    if (file.type && !isAllowedType(file.type)) { setError(t("סוג קובץ לא נתמך. יש להעלות תמונה או PDF.")); return; }
    setError(null);
    start(async () => {
      const dot = file.name.lastIndexOf(".");
      const rawExt = dot > 0 ? file.name.slice(dot + 1) : "";
      const ext = rawExt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
      const path = `${referralId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await createClient().storage.from("referral-results").upload(path, file, { contentType: file.type || undefined });
      if (upErr) { setError(t("העלאת הקובץ נכשלה. נסה/י שוב.")); return; }
      const res = await markReferralResultReceived(referralId, path, file.name);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  if (status === "received") {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <span className="pill pill-ok">{t("התקבלה תשובה")}</span>
        {resultUrl && (
          <a href={resultUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex max-w-[12rem] items-center gap-1 font-medium text-accent hover:underline">
            <span className="shrink-0"><Icon name="file" size={12} /></span> <span className="truncate">{resultName ?? t("פתיחת הקובץ")}</span>
          </a>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); start(async () => { await unmarkReferralResult(referralId); router.refresh(); }); }}
          className="min-h-11 text-muted hover:underline sm:min-h-0"
        >
          {t("ביטול הסימון")}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
      <span className="pill pill-warn">{t("ממתין לתשובה")}</span>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" aria-label={t("קובץ התוצאה")} className="hidden" onChange={onFileChange} onClick={(e) => e.stopPropagation()} />
      <button
        type="button"
        disabled={pending}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRef.current?.click(); }}
        className="min-h-11 font-medium text-accent hover:underline sm:min-h-0"
      >
        {pending ? t("שומר…") : t("סימון שהתשובה התקבלה")}
      </button>
      {error && <span className="text-bad">{error}</span>}
    </div>
  );
}
