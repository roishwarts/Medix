import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { israelParts } from "@/lib/dates";
import { ViewAsRow } from "./view-as-row";

export const dynamic = "force-dynamic";

type RoleKey = "admin" | "doctor" | "staff" | "patient" | "caregiver";
const ROLE_LABEL: Record<RoleKey, string> = {
  admin: "מנהל מערכת",
  doctor: "רופא",
  staff: "צוות",
  patient: "מטופל",
  caregiver: "בן משפחה",
};
const ROLE_PILL: Record<RoleKey, string> = {
  admin: "pill-info",
  doctor: "pill-info",
  staff: "pill-info",
  patient: "pill-neutral",
  caregiver: "pill-neutral",
};
const FILTERS = [["all", "הכול"], ["doctor", "רופאים"], ["staff", "צוות"], ["patient", "מטופלים"], ["caregiver", "בני משפחה"], ["admin", "מנהלים"]] as const;
type Filter = (typeof FILTERS)[number][0];

const RANK: Record<RoleKey, number> = { admin: 0, doctor: 1, staff: 2, patient: 3, caregiver: 4 };
const dmy = (iso: string) => israelParts(iso).date.split("-").reverse().join(".");

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const sp = await searchParams;
  const active: Filter = FILTERS.some(([k]) => k === sp.role) ? (sp.role as Filter) : "all";
  const q = (sp.q ?? "").trim();
  const { db } = await requireAdmin();

  const [{ data: profiles }, { data: clinics }, { data: admins }] = await Promise.all([
    db.from("profiles").select("id, clinic_id, role, full_name, disabled, created_at"),
    db.from("clinics").select("id, name"),
    db.from("platform_admins").select("user_id"),
  ]);

  // Login names and last sign-in live in the auth system.
  const auth = new Map<string, { email: string; last: string | null; created: string | null }>();
  for (let page = 1; page <= 10; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    for (const u of users) auth.set(u.id, { email: u.email ?? "", last: u.last_sign_in_at ?? null, created: u.created_at ?? null });
    if (users.length < 1000) break;
  }

  const clinicName = new Map((clinics ?? []).map((c) => [c.id as string, c.name as string]));
  type Row = { id: string; name: string; role: RoleKey; clinic: string; username: string; disabled: boolean; last: string | null; created: string | null };
  const rows: Row[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.role as RoleKey,
    clinic: clinicName.get(p.clinic_id) ?? "—",
    username: auth.get(p.id)?.email.split("@")[0] ?? "",
    disabled: !!p.disabled,
    last: auth.get(p.id)?.last ?? null,
    created: auth.get(p.id)?.created ?? p.created_at ?? null,
  }));
  const profileIds = new Set(rows.map((r) => r.id));
  for (const a of admins ?? []) {
    if (profileIds.has(a.user_id)) continue;
    const u = auth.get(a.user_id);
    rows.push({ id: a.user_id, name: u?.email.split("@")[0] ?? "מנהל", role: "admin", clinic: "—", username: u?.email.split("@")[0] ?? "", disabled: false, last: u?.last ?? null, created: u?.created ?? null });
  }

  const matchesQuery = (r: Row) => !q || `${r.name} ${r.username} ${r.clinic}`.toLowerCase().includes(q.toLowerCase());
  const inFilter = (r: Row, k: Filter) => k === "all" || r.role === k;
  const shown = rows.filter((r) => inFilter(r, active) && matchesQuery(r)).sort((a, b) => RANK[a.role] - RANK[b.role] || a.name.localeCompare(b.name, "he"));
  const count = (k: Filter) => rows.filter((r) => inFilter(r, k) && matchesQuery(r)).length;
  const href = (k: Filter) => {
    const params = new URLSearchParams();
    if (k !== "all") params.set("role", k);
    if (q) params.set("q", q);
    const s = params.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };

  return (
    <main>
      <p className="eyebrow">{rows.length} משתמשים</p>
      <h1 className="display mt-1 text-4xl">משתמשים</h1>
      <p className="mt-2 text-muted">לחיצה על משתמש פותחת את המערכת כפי שהוא רואה אותה, בקריאה בלבד. ניהול משתמשי צוות נעשה בכרטיס המרפאה.</p>

      <form className="mt-6 flex gap-2">
        {active !== "all" && <input type="hidden" name="role" value={active} />}
        <input name="q" defaultValue={q} className="field" placeholder="חיפוש לפי שם, שם משתמש או מרפאה" aria-label="חיפוש משתמשים" />
        <button className="btn btn-sm shrink-0 self-center">חיפוש</button>
        {q && <Link href={active === "all" ? "/admin/users" : `/admin/users?role=${active}`} className="btn btn-quiet btn-sm shrink-0 self-center">ניקוי</Link>}
      </form>

      <nav aria-label="סינון לפי תפקיד" className="chip-row mt-4">
        {FILTERS.map(([key, label]) => (
          <Link key={key} href={href(key)} scroll={false} aria-current={key === active ? "page" : undefined} className="chip">
            {label} <span className="num text-xs">{count(key)}</span>
          </Link>
        ))}
      </nav>

      <ul className="card mt-2 divide-y divide-line">
        {shown.map((r) => {
          const body = (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`font-medium ${r.disabled ? "text-muted line-through" : ""}`}>{r.name}</span>
                <span className={`pill ${ROLE_PILL[r.role]}`}>{ROLE_LABEL[r.role]}</span>
                {r.disabled && <span className="pill pill-bad">מושבת</span>}
              </div>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted">
                {r.clinic !== "—" && <span>{r.clinic}</span>}
                {r.username && <span dir="ltr" className="num">{r.username}</span>}
                <span>{r.last ? `כניסה אחרונה ${dmy(r.last)}` : "טרם נכנס"}</span>
              </p>
            </>
          );
          // Tapping a user opens the system as they see it. Admins and disabled users cannot be opened.
          return r.role === "admin" || r.disabled ? (
            <li key={r.id} className="px-4 py-3">{body}</li>
          ) : (
            <ViewAsRow key={r.id} id={r.id} name={r.name}>{body}</ViewAsRow>
          );
        })}
        {shown.length === 0 && <li className="px-4 py-8 text-center text-muted">אין משתמשים שמתאימים.</li>}
      </ul>
    </main>
  );
}
