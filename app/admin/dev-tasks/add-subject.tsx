"use client";

import { useT } from "@/components/i18n-provider";
import { useState, useTransition } from "react";
import { addSubject } from "./actions";

export function AddSubject() {
  const t = useT();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await addSubject(title);
      if (res.error) setError(res.error);
      else setTitle("");
    });
  }

  return (
    <form onSubmit={submit} className="mt-8 border-t border-line pt-6">
      <label htmlFor="subject" className="lbl">{t("נושא חדש")}</label>
      <div className="flex gap-2">
        <input id="subject" className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t("למשל: דוחות וניתוח נתונים")} autoComplete="off" enterKeyHint="done" />
        <button className="btn btn-primary shrink-0" disabled={pending || !title.trim()}>{pending ? t("מוסיף…") : t("הוספה")}</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </form>
  );
}
