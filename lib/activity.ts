import { israelParts } from "./dates";

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

export function describe(e: ActivityRow): string {
  const who = e.actor_name ?? "מישהו";
  const s = e.subject ? `"${e.subject}"` : "";
  switch (e.kind) {
    case "task_submitted": return `${who} שלח/ה ${s} לבדיקה`;
    case "task_completed": return `${who} סימן/ה ${s} כבוצע`;
    case "task_accepted": return `${who} אישר/ה ${s}`;
    case "task_rejected": return `${who} החזיר/ה ${s} לתיקון`;
    case "task_reopened": return `${who} פתח/ה מחדש את ${s}`;
    case "appointment_scheduled": return `${who} קבע/ה מועד ל${s}${e.detail ? `: ${e.detail}` : ""}`;
    case "journey_edited": return `${who} ערך/ה את המסלול של המטופל`;
    case "patient_created": return `${who} פתח/ה מטופל חדש`;
    case "patient_joined": return `${who} יצר/ה משתמש והצטרף/ה`;
    case "caregiver_joined": return `${who} הצטרף/ה כבן משפחה${e.detail ? ` (${e.detail})` : ""}`;
    case "caregiver_invited": return `${who} הזמין/ה את ${e.subject ?? "בן משפחה"}${e.detail ? ` (${e.detail})` : ""}`;
    case "caregiver_removed": return `הוסר בן משפחה: ${e.subject ?? ""}${e.detail ? ` (${e.detail})` : ""}`;
    case "reset_requested": return `${who} ביקש/ה איפוס סיסמה`;
    case "reset_link_sent": return `${who} יצר/ה קישור לאיפוס סיסמה ל${e.subject ?? "משתמש"}`;
    default: return who;
  }
}

export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "לפני שעה" : `לפני ${hours} שע׳`;
  const { date } = israelParts(iso);
  const [, m, d] = date.split("-");
  return `${Number(d)}.${Number(m)}`;
}

export function toItems(
  rows: ActivityRow[],
  opts: { patientNames: Map<string, string>; journeyByPatient: Map<string, string>; me: string; seenAt: string | null },
): ActivityItem[] {
  return rows.map((e) => {
    const journeyId = e.journey_id ?? (e.patient_id ? opts.journeyByPatient.get(e.patient_id) : undefined);
    return {
      id: e.id,
      href: journeyId ? `/clinic/patients/${journeyId}` : "/clinic/patients",
      patientName: e.patient_id ? (opts.patientNames.get(e.patient_id) ?? null) : null,
      who: e.actor_name ?? "",
      role: e.actor_role,
      text: describe(e),
      note: e.kind === "task_rejected" ? e.detail : null,
      when: timeAgo(e.created_at),
      isNew: e.actor_id !== opts.me && (!opts.seenAt || e.created_at > opts.seenAt),
    };
  });
}
