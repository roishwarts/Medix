import { logout } from "@/app/login/actions";
import type { Readiness, TaskState } from "@/lib/journey";

export function Icon({ name, size = 16 }: { name: "check" | "lock" | "clock" | "alert" | "arrow" | "file" | "plus" | "trash" | "up" | "down"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "check": return <svg {...common}><path d="M3 8.5l3.2 3.2L13 4.8" /></svg>;
    case "lock": return <svg {...common}><rect x="3.5" y="7" width="9" height="6.5" rx="1" /><path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" /></svg>;
    case "clock": return <svg {...common}><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2 1.3" /></svg>;
    case "alert": return <svg {...common}><path d="M8 3.5v5.2M8 11.3v.2" /></svg>;
    case "arrow": return <svg {...common}><path d="M13 8H3m4-4L3 8l4 4" /></svg>;
    case "file": return <svg {...common}><path d="M4 2.5h5l3 3v8H4z" /><path d="M9 2.5v3h3" /></svg>;
    case "plus": return <svg {...common}><path d="M8 3v10M3 8h10" /></svg>;
    case "trash": return <svg {...common}><path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8.5h5l.5-8.5" /></svg>;
    case "up": return <svg {...common}><path d="M4 10l4-4 4 4" /></svg>;
    case "down": return <svg {...common}><path d="M4 6l4 4 4-4" /></svg>;
  }
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <button className="btn btn-quiet btn-sm">יציאה</button>
    </form>
  );
}

const READINESS_LABEL: Record<Readiness, string> = {
  ready: "מוכן",
  in_progress: "בהכנה",
  not_ready: "לא מוכן",
};
const READINESS_CLASS: Record<Readiness, string> = {
  ready: "pill-ok",
  in_progress: "pill-info",
  not_ready: "pill-bad",
};

export function ReadinessPill({ state }: { state: Readiness }) {
  return (
    <span className={`pill ${READINESS_CLASS[state]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {READINESS_LABEL[state]}
    </span>
  );
}

export function ReadinessBar({ value, state }: { value: number; state: Readiness }) {
  const color = state === "ready" ? "bg-ok" : state === "not_ready" ? "bg-bad" : "bg-accent";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

const STATE_TEXT: Record<TaskState, [string, string]> = {
  done: ["הושלם", "pill-ok"],
  locked: ["נעול", "pill-neutral"],
  review: ["ממתין לבדיקה", "pill-warn"],
  rejected: ["הוחזר לתיקון", "pill-bad"],
  todo: ["פתוח", "pill-neutral"],
};

export function TaskStatePill({ state, overdue }: { state: TaskState; overdue?: boolean }) {
  if (overdue) return <span className="pill pill-bad">באיחור</span>;
  const [text, cls] = STATE_TEXT[state];
  return <span className={`pill ${cls}`}>{text}</span>;
}
