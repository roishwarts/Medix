"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { VoiceTextarea } from "@/components/voice-input";
import { QuestionCard, type QuestionItem } from "../../questions/question-card";
import { askDoctor } from "../../questions/actions";

// "Questions for the doctor" on the patient card: send a new one, see open ones and the doctor's answers.
// The doctor answers right here as well as from the queue.
export function DoctorQuestions({
  patientId, journeyId, items, isDoctor, myId, available,
}: {
  patientId: string; journeyId: string; items: QuestionItem[]; isDoctor: boolean; myId: string; available: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!available) return null;

  const waiting = items.filter((q) => !q.answeredAt);
  const answered = items.filter((q) => q.answeredAt);

  function send() {
    if (!question.trim()) { setError(t("יש לכתוב את השאלה")); return; }
    setError(null);
    start(async () => {
      const res = await askDoctor({ patientId, journeyId, question, urgent });
      if (res.error) { setError(res.error); return; }
      setQuestion(""); setUrgent(false); setOpen(false);
      router.refresh();
    });
  }

  return (
    <section id="doctor-questions" aria-label={t("שאלות לרופא")} className="scroll-mt-4">
      <h2 className="eyebrow mb-2 flex flex-wrap items-center gap-2">
        {t("שאלות לרופא")}
        {waiting.length > 0 && <span className="pill pill-warn">{t("{n} ממתינות", { n: waiting.length })}</span>}
      </h2>
      <div className="card divide-y divide-line">
        {items.length === 0 && !open && <p className="px-4 py-3 text-sm text-muted">{t("אין שאלות לרופא על המטופל הזה.")}</p>}
        {waiting.map((q) => <QuestionCard key={q.id} q={q} showPatient={false} canAnswer={isDoctor} canWithdraw={isDoctor || q.askedById === myId} />)}
        {answered.slice(0, 3).map((q) => <QuestionCard key={q.id} q={q} showPatient={false} canAnswer={false} canWithdraw={false} />)}
        {open ? (
          <div className="space-y-3 px-4 py-3">
            <div>
              <label className="lbl" htmlFor="ask-q">{t("השאלה לרופא")}</label>
              <VoiceTextarea id="ask-q" className="field min-h-20" placeholder={t("מה צריך להחליט או לבדוק?")} value={question} onChange={setQuestion} />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="size-4" />
              {t("דחוף")}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-primary btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={send}>
                {pending ? t("שולח…") : t("שליחה לרופא")}
              </button>
              <button type="button" className="btn btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={() => setOpen(false)}>{t("ביטול")}</button>
              {error && <p role="alert" className="text-sm text-bad">{error}</p>}
            </div>
          </div>
        ) : (
          <button type="button" className="flex min-h-11 w-full items-center px-4 py-2.5 text-start text-sm font-medium text-accent hover:underline" onClick={() => setOpen(true)}>
            {t("שאלה חדשה לרופא")}
          </button>
        )}
      </div>
    </section>
  );
}
