"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { VoiceTextarea } from "@/components/voice-input";
import { israelParts } from "@/lib/dates";
import { answerQuestion, withdrawQuestion } from "./actions";

export type QuestionItem = {
  id: string;
  patientId: string;
  journeyId: string | null;
  patientName: string;
  question: string;
  urgent: boolean;
  askedById: string | null;
  askedByName: string;
  askedAt: string;
  answer: string | null;
  answeredByName: string | null;
  answeredAt: string | null;
};

const stamp = (iso: string) => {
  const p = israelParts(iso);
  return `${p.date.split("-").reverse().join(".")} ${p.time}`;
};

export function QuestionCard({
  q, canAnswer, canWithdraw, showPatient = true,
}: {
  q: QuestionItem; canAnswer: boolean; canWithdraw: boolean; showPatient?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const answered = !!q.answeredAt;

  function send() {
    if (!answer.trim()) { setError(t("יש לכתוב תשובה")); return; }
    setError(null);
    start(async () => {
      const res = await answerQuestion(q.id, answer);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }
  function withdraw() {
    start(async () => {
      const res = await withdrawQuestion(q.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className={`px-4 py-3 text-sm ${q.urgent && !answered ? "border-s-4 border-s-bad bg-bad-soft" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2">
          {showPatient && (
            <Link href={`/clinic/patients/${q.journeyId ?? q.patientId}`} className="font-medium underline-offset-4 hover:underline">{q.patientName}</Link>
          )}
          {q.urgent && !answered && <span className="pill pill-bad">{t("דחוף")}</span>}
          {answered ? <span className="pill pill-ok">{t("נענתה")}</span> : <span className="pill pill-warn">{t("ממתינה לרופא")}</span>}
        </p>
        <span className="text-xs text-muted">{q.askedByName} · {stamp(q.askedAt)}</span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap break-words">{q.question}</p>

      {answered && (
        <div className="mt-2 rounded-lg bg-paper px-2.5 py-1.5">
          <p className="whitespace-pre-wrap break-words">
            <span className="font-medium">{t("תשובת הרופא: ")}</span>{q.answer}
          </p>
          <p className="mt-0.5 text-xs text-muted">{q.answeredByName} · {stamp(q.answeredAt!)}</p>
        </div>
      )}

      {!answered && canAnswer && (
        <div className="mt-3 space-y-2">
          <VoiceTextarea className="field min-h-20" placeholder={t("התשובה שלך…")} value={answer} onChange={setAnswer} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={send}>
              {pending ? t("שולח…") : t("שליחת תשובה")}
            </button>
            {canWithdraw && <button type="button" className="text-sm text-bad hover:underline" disabled={pending} onClick={withdraw}>{t("הסרת השאלה")}</button>}
          </div>
        </div>
      )}
      {!answered && !canAnswer && canWithdraw && (
        <button type="button" className="mt-2 text-sm text-bad hover:underline" disabled={pending} onClick={withdraw}>{t("ביטול השאלה")}</button>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
