"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/ui";
import { EQ5D_DIMENSIONS, EQ5D_LEVELS, OKS_ITEMS, type Instrument } from "@/lib/proms";
import { toast } from "@/components/toast";
import { submitProms } from "../../actions";

export function PromsForm({ taskId, instrument }: { taskId: string; instrument: Instrument }) {
  const router = useRouter();
  const t = useT();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [vas, setVas] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const items = instrument === "oks" ? OKS_ITEMS.map((i) => i.key) : EQ5D_DIMENSIONS.map((d) => d.key);
  const complete = items.every((k) => answers[k] !== undefined);

  function send() {
    if (!complete) { setError(t("יש לענות על כל השאלות")); return; }
    setError(null);
    start(async () => {
      const payload = instrument === "eq5d5l" ? { ...answers, vas } : answers;
      const res = await submitProms(taskId, payload);
      if (res.error) return setError(res.error);
      toast(t("התשובות נשלחו ונשמרו בהצלחה"));
      router.push("/journey");
    });
  }

  return (
    <form
      className="card space-y-6 p-5"
      aria-busy={pending}
      onSubmit={(e) => { e.preventDefault(); if (!pending) send(); }}
    >
      <fieldset disabled={pending} className="space-y-6 disabled:opacity-80">
        {instrument === "oks"
          ? OKS_ITEMS.map((item, idx) => (
              <fieldset key={item.key}>
                <legend className="mb-2 font-medium">{idx + 1}. {item.title}</legend>
                <div className="space-y-1.5">
                  {item.answers.map((a) => (
                    <label key={a.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                      <input
                        type="radio" name={item.key} value={a.value} className="shrink-0"
                        checked={answers[item.key] === a.value}
                        onChange={() => setAnswers((p) => ({ ...p, [item.key]: a.value }))}
                      />
                      <span>{a.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))
          : (
            <>
              {EQ5D_DIMENSIONS.map((dim, idx) => (
                <fieldset key={dim.key}>
                  <legend className="mb-2 font-medium">{idx + 1}. {dim.title}</legend>
                  <div className="space-y-1.5">
                    {EQ5D_LEVELS.map((label, i) => {
                      const value = i + 1;
                      return (
                        <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                          <input
                            type="radio" name={dim.key} value={value} className="shrink-0"
                            checked={answers[dim.key] === value}
                            onChange={() => setAnswers((p) => ({ ...p, [dim.key]: value }))}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <div>
                <label htmlFor="vas" className="mb-2 block font-medium">{t("בסולם של 0 עד 100, איך הבריאות שלך היום? (0 = הכי גרוע שאפשר לדמיין, 100 = הכי טוב שאפשר לדמיין)")}</label>
                <input id="vas" type="range" min={0} max={100} value={vas} dir="ltr" className="w-full" onChange={(e) => setVas(Number(e.target.value))} />
                <p className="num mt-1 text-center text-2xl font-semibold">{vas}</p>
              </div>
            </>
          )}

        <div role="alert" aria-live="assertive">
          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
              <span className="mt-0.5 shrink-0"><Icon name="alert" /></span>
              <span>{error}</span>
            </p>
          )}
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? t("שולח…") : t("שליחת השאלון")}
        </button>
      </fieldset>
    </form>
  );
}
