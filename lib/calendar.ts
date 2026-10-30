import type { PatientJourney } from "./queries";
import { today } from "./dates";
import type { T } from "./i18n";

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
export function patientEvents(j: PatientJourney, t: T): CalEvent[] {
  const out: CalEvent[] = [
    { id: `s-${j.id}`, date: j.surgery_date, time: null, title: t("יום הניתוח"), kind: "surgery", tone: "accent", href: "/journey" },
  ];
  for (const task of j.summary.tasks) {
    const href = `/journey/tasks/${task.id}`;
    if (task.kind === "appointment") {
      out.push({
        id: task.id, date: task.eventDate, time: task.eventTime, title: task.title, kind: "appointment",
        tone: stateTone(task.state, task.overdue), href, sub: task.location ?? undefined,
      });
    } else if (task.owner === "patient") {
      out.push({
        id: task.id, date: task.dueDate, time: null, title: task.title, kind: "deadline",
        tone: stateTone(task.state, task.overdue), href,
      });
    }
  }
  return out;
}

// What the clinic sees: every patient's surgery, appointments, and open deadlines.
export function clinicEvents(journeys: PatientJourney[], t: T): CalEvent[] {
  const out: CalEvent[] = [];
  const t0 = today();
  for (const j of journeys) {
    const href = `/clinic/patients/${j.id}`;
    const name = j.patient.full_name;
    const { readiness, readinessState } = j.summary;
    out.push({
      id: `s-${j.id}`, date: j.surgery_date, time: null, title: t("ניתוח – {name}", { name }), kind: "surgery",
      tone: readinessState === "ready" ? "ok" : readinessState === "not_ready" ? "bad" : "info",
      href, sub: t("מוכנות {n}%", { n: readiness }), patient: name,
    });
    for (const task of j.summary.tasks) {
      if (task.kind === "appointment") {
        out.push({
          id: task.id, date: task.eventDate, time: task.eventTime, title: task.title, kind: "appointment",
          tone: stateTone(task.state, task.overdue), href, sub: task.location ?? undefined, patient: name,
        });
      } else if (task.state !== "done" && task.state !== "locked") {
        out.push({
          id: task.id, date: task.dueDate, time: null, title: task.title, kind: "deadline",
          tone: task.dueDate < t0 ? "bad" : stateTone(task.state, task.overdue), href, patient: name,
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
