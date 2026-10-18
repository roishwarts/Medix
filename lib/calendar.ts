import type { PatientJourney } from "./queries";
import { today } from "./dates";

export type CalKind = "surgery" | "appointment" | "deadline";
export type CalTone = "ok" | "bad" | "warn" | "info" | "neutral" | "accent";

export type CalEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm
  title: string;
  kind: CalKind;
  tone: CalTone;
  href: string;
  sub?: string;
  patient?: string;
};

const stateTone = (state: string, overdue: boolean): CalTone =>
  state === "done" ? "ok" : overdue ? "bad" : state === "review" ? "warn" : "neutral";

// What a patient (or caregiver) sees: the surgery, appointments, and their own deadlines.
export function patientEvents(j: PatientJourney): CalEvent[] {
  const out: CalEvent[] = [
    { id: `s-${j.id}`, date: j.surgery_date, time: null, title: "יום הניתוח", kind: "surgery", tone: "accent", href: "/journey" },
  ];
  for (const t of j.summary.tasks) {
    const href = `/journey/tasks/${t.id}`;
    if (t.kind === "appointment") {
      out.push({
        id: t.id, date: t.eventDate, time: t.eventTime, title: t.title, kind: "appointment",
        tone: stateTone(t.state, t.overdue), href, sub: t.location ?? undefined,
      });
    } else if (t.owner === "patient") {
      out.push({
        id: t.id, date: t.dueDate, time: null, title: t.title, kind: "deadline",
        tone: stateTone(t.state, t.overdue), href,
      });
    }
  }
  return out;
}

// What the clinic sees: every patient's surgery, appointments, and open deadlines.
export function clinicEvents(journeys: PatientJourney[]): CalEvent[] {
  const out: CalEvent[] = [];
  const t0 = today();
  for (const j of journeys) {
    const href = `/clinic/patients/${j.id}`;
    const name = j.patient.full_name;
    const { readiness, readinessState } = j.summary;
    out.push({
      id: `s-${j.id}`, date: j.surgery_date, time: null, title: `ניתוח – ${name}`, kind: "surgery",
      tone: readinessState === "ready" ? "ok" : readinessState === "not_ready" ? "bad" : "info",
      href, sub: `מוכנות ${readiness}%`, patient: name,
    });
    for (const t of j.summary.tasks) {
      if (t.kind === "appointment") {
        out.push({
          id: t.id, date: t.eventDate, time: t.eventTime, title: t.title, kind: "appointment",
          tone: stateTone(t.state, t.overdue), href, sub: t.location ?? undefined, patient: name,
        });
      } else if (t.state !== "done" && t.state !== "locked") {
        out.push({
          id: t.id, date: t.dueDate, time: null, title: t.title, kind: "deadline",
          tone: t.dueDate < t0 ? "bad" : stateTone(t.state, t.overdue), href, patient: name,
        });
      }
    }
  }
  return out;
}

export function byDate(events: CalEvent[]): Map<string, CalEvent[]> {
  const map = new Map<string, CalEvent[]>();
  for (const e of events) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  const order = { surgery: 0, appointment: 1, deadline: 2 } as const;
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        order[a.kind] - order[b.kind] ||
        (a.time ?? "99:99").localeCompare(b.time ?? "99:99") ||
        a.title.localeCompare(b.title, "he"),
    );
  }
  return map;
}
