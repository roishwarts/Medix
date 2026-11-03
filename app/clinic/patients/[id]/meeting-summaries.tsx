"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { VoiceTextarea } from "@/components/voice-input";
import { israelParts } from "@/lib/dates";
import { saveMeetingSummary, deleteMeetingSummary } from "./notes-actions";
import { NEW_SUMMARY_EVENT } from "./doctor-quick-bar";

export type SummaryItem = {
  id: string;
  occurredAt: string;
  note: string;
  followUp: string | null;
  authorName: string;
  journeyTaskId: string | null;
  linkedTitle: string | null;
};
export type ApptOption = { id: string; title: string; eventDate: string };

function toLocalInput(iso: string): string {
  const { date, time } = israelParts(iso);
  return `${date}T${time}`;
}

export function MeetingSummaries({ patientId, items, appointments }: { patientId: string; items: SummaryItem[]; appointments: ApptOption[] }) {
  const t = useT();
  const [editing, setEditing] = useState<string | null>(null); // summary id, or "new"

  // The phone's quick-action bar asks for a new summary: open the form and bring it into view.
  useEffect(() => {
    const open = () => {
      setEditing("new");
      setTimeout(() => document.getElementById("meeting-summaries")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };
    window.addEventListener(NEW_SUMMARY_EVENT, open);
    return () => window.removeEventListener(NEW_SUMMARY_EVENT, open);
  }, []);

  return (
    <section id="meeting-summaries" aria-label={t("סיכומי פגישות")} className="scroll-mt-4">
      <h2 className="eyebrow mb-2">{t("סיכומי פגישות")}</h2>
      <div className="card divide-y divide-line">
        {items.length === 0 && editing !== "new" && <p className="px-4 py-3 text-sm text-muted">{t("אין עדיין סיכומי פגישות.")}</p>}
        {items.map((s) =>
          editing === s.id ? (
            <SummaryForm key={s.id} patientId={patientId} appointments={appointments} existing={s} onClose={() => setEditing(null)} />
          ) : (
            <div key={s.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{israelParts(s.occurredAt).date.split("-").reverse().join(".")} {israelParts(s.occurredAt).time}</p>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>{s.authorName}</span>
                  <button type="button" className="min-h-11 text-accent hover:underline sm:min-h-0" onClick={() => setEditing(s.id)}>{t("עריכה")}</button>
                </div>
              </div>
              {s.linkedTitle && <p className="mt-0.5 text-xs text-muted">{t("בקשר ל: {title}", { title: s.linkedTitle })}</p>}
              <p className="mt-1.5 whitespace-pre-wrap break-words">{s.note}</p>
              {s.followUp && (
                <p className="mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-paper px-2.5 py-1.5 text-muted">
                  <span className="font-medium text-ink">{t("המשך ומעקב: ")}</span>{s.followUp}
                </p>
              )}
            </div>
          ),
        )}
        {editing === "new" ? (
          <SummaryForm patientId={patientId} appointments={appointments} onClose={() => setEditing(null)} />
        ) : (
          <button type="button" className="block w-full px-4 py-2.5 text-start text-sm font-medium text-accent hover:underline" onClick={() => setEditing("new")}>
            {t("סיכום פגישה חדש")}
          </button>
        )}
      </div>
    </section>
  );
}

function SummaryForm({
  patientId,
  appointments,
  existing,
  onClose,
}: {
  patientId: string;
  appointments: ApptOption[];
  existing?: SummaryItem;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [occurredAt, setOccurredAt] = useState(existing ? toLocalInput(existing.occurredAt) : toLocalInput(new Date().toISOString()));
  const [apptId, setApptId] = useState(existing?.journeyTaskId ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [followUp, setFollowUp] = useState(existing?.followUp ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    if (!note.trim()) { setError(t("יש לכתוב מה נדון בפגישה")); return; }
    setError(null);
    start(async () => {
      const res = await saveMeetingSummary({
        id: existing?.id,
        patientId,
        journeyTaskId: apptId || null,
        occurredAt: new Date(occurredAt).toISOString(),
        note,
        followUp,
      });
      if (res.error) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  function remove() {
    if (!existing) return;
    if (!confirm(t("למחוק את הסיכום הזה?"))) return;
    start(async () => {
      const res = await deleteMeetingSummary(existing.id);
      if (res.error) setError(res.error);
      else { onClose(); router.refresh(); }
    });
  }

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="lbl" htmlFor="sum-when">{t("מועד הפגישה")}</label>
          <input id="sum-when" type="datetime-local" dir="ltr" className="field num" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </div>
        {appointments.length > 0 && (
          <div>
            <label className="lbl" htmlFor="sum-appt">{t("קשור לתור (לא חובה)")}</label>
            <select id="sum-appt" className="field" value={apptId} onChange={(e) => setApptId(e.target.value)}>
              <option value="">{t("ללא")}</option>
              {appointments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="lbl" htmlFor="sum-note">{t("מה נדון")}</label>
        <VoiceTextarea id="sum-note" className="field min-h-24" placeholder={t("מה נאמר בפגישה, מה סוכם…")} value={note} onChange={setNote} />
      </div>
      <div>
        <label className="lbl" htmlFor="sum-followup">{t("המשך ומעקב (לא חובה)")}</label>
        <VoiceTextarea id="sum-followup" className="field min-h-16" placeholder={t("מה צריך לעשות הלאה…")} value={followUp} onChange={setFollowUp} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={save}>
          {pending ? t("שומר…") : t("שמירה")}
        </button>
        <button type="button" className="btn btn-sm min-h-11 sm:min-h-9" disabled={pending} onClick={onClose}>{t("ביטול")}</button>
        {existing && (
          <button type="button" className="min-h-11 text-sm text-bad hover:underline sm:min-h-0" disabled={pending} onClick={remove}>{t("מחיקה")}</button>
        )}
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </div>
    </div>
  );
}
