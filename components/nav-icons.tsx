export type NavIconName = "home" | "tasks" | "patients" | "calendar" | "updates" | "templates" | "content" | "clinics" | "users" | "dev" | "family" | "settings" | "insights";

const PATHS: Record<NavIconName, React.ReactNode> = {
  home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  tasks: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="m9 12 2 2 4-4M9 17h6" /></>,
  patients: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5" /><circle cx="17" cy="9" r="2.4" /><path d="M16.5 14.7c2.4 0 4 1.7 4 4.3" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M4 10h16M9 3.5v4M15 3.5v4" /></>,
  updates: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  templates: <><path d="M12 4 3.5 8.5 12 13l8.5-4.5z" /><path d="m3.5 13 8.5 4.5 8.5-4.5" /></>,
  content: <><rect x="4" y="4.5" width="16" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 17 4.5-4 3 2.5 3-3.5L20 16" /></>,
  clinics: <><path d="M5 20V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14M15 10h3a1 1 0 0 1 1 1v9M3.5 20h17" /><path d="M9 9v4M7 11h4" /></>,
  users: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" /></>,
  dev: <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 5.5l-3 13" />,
  family: <path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" />,
  insights: <><path d="M4 20V10M10 20V4M16 20v-7M20 20V13" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
};

export function NavIcon({ name, size = 22 }: { name: NavIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
