import { israelParts } from "./dates";
import type { T } from "./i18n";

export type ActivityRow = {
  id: string;
  kind: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  subject: string | null;
  detail: string | null;
  created_at: string;
  patient_id: string | null;
  journey_id: string | null;
};

export type ActivityItem = {
  id: string;
  href: string;
  patientName: string | null;
  who: string;
  role: string | null;
  text: string;
  note: string | null;
  when: string;
  isNew: boolean;
};

export const ROLE_LABEL: Record<string, string> = {
  patient: "מטופל",
  caregiver: "בן משפחה",
  staff: "צוות",
  doctor: "רופא",
};

export type GroupKey = "all" | "patients" | "staff" | "accounts";

// Tabs on the updates page: which events (and who caused them) each one shows.
export const GROUPS: { key: GroupKey; label: string; kinds?: string[]; roles?: string[] }[] = [
  { key: "all", label: "הכול" },
  { key: "patients", label: "מטופלים ובני משפחה", kinds: ["task_submitted", "task_completed"], roles: ["patient", "caregiver"] },
  {
    key: "staff",
    label: "הצוות",
    kinds: ["task_accepted", "task_rejected", "task_reopened", "task_completed", "appointment_scheduled", "journey_edited", "patient_created"],
    roles: ["staff", "doctor"],
  },
  {
    key: "accounts",
    label: "חשבונות",
    kinds: ["patient_joined", "caregiver_joined", "caregiver_invited", "caregiver_removed", "reset_requested", "reset_link_sent"],
  },
];

export function describe(e: ActivityRow, t: T): string {
  const who = e.actor_name ?? t("מישהו");
  const subject = e.subject ?? "";
  const detail = e.detail ?? "";
  switch (e.kind) {
    case "task_submitted": return t("{who} שלח/ה \"{subject}\" לבדיקה", { who, subject });
    case "task_completed": return t("{who} סימן/ה \"{subject}\" כבוצע", { who, subject });
    case "task_accepted": return t("{who} אישר/ה \"{subject}\"", { who, subject });
    case "task_rejected": return t("{who} החזיר/ה \"{subject}\" לתיקון", { who, subject });
    case "task_reopened": return t("{who} פתח/ה מחדש את \"{subject}\"", { who, subject });
    case "appointment_scheduled": return t("{who} קבע/ה מועד ל\"{subject}\"", { who, subject }) + (detail ? `: ${detail}` : "");
    case "journey_edited": return t("{who} ערך/ה את המסלול של המטופל", { who });
    case "patient_created": return t("{who} פתח/ה מטופל חדש", { who });
    case "patient_joined": return t("{who} יצר/ה משתמש והצטרף/ה", { who });
    case "caregiver_joined": return t("{who} הצטרף/ה כבן משפחה", { who }) + (detail ? ` (${detail})` : "");
    case "caregiver_invited": return t("{who} הזמין/ה את {name}", { who, name: e.subject ?? t("בן משפחה") }) + (detail ? ` (${detail})` : "");
    case "caregiver_removed": return t("הוסר בן משפחה: {name}", { name: subject }) + (detail ? ` (${detail})` : "");
    case "reset_requested": return t("{who} ביקש/ה איפוס סיסמה", { who });
    case "reset_link_sent": return t("{who} יצר/ה קישור לאיפוס סיסמה ל{name}", { who, name: e.subject ?? t("משתמש") });
    default: return who;
  }
}

export function timeAgo(iso: string, t: T, now = Date.now()): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t("עכשיו");
  if (mins < 60) return t("לפני {n} דק׳", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? t("לפני שעה") : t("לפני {n} שע׳", { n: hours });
  const { date } = israelParts(iso);
  const [, m, d] = date.split("-");
  return `${Number(d)}.${Number(m)}`;
}

export function toItems(
  rows: ActivityRow[],
  opts: { t: T; patientNames: Map<string, string>; journeyByPatient: Map<string, string>; me: string; seenAt: string | null },
): ActivityItem[] {
  return rows.map((e) => {
    const journeyId = e.journey_id ?? (e.patient_id ? opts.journeyByPatient.get(e.patient_id) : undefined);
    return {
      id: e.id,
      href: journeyId ? `/clinic/patients/${journeyId}` : "/clinic/patients",
      patientName: e.patient_id ? (opts.patientNames.get(e.patient_id) ?? null) : null,
      who: e.actor_name ?? "",
      role: e.actor_role,
      text: describe(e, opts.t),
      note: e.kind === "task_rejected" ? e.detail : null,
      when: timeAgo(e.created_at, opts.t),
      isNew: e.actor_id !== opts.me && (!opts.seenAt || e.created_at > opts.seenAt),
    };
  });
}
