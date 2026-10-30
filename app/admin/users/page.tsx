import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { israelParts } from "@/lib/dates";
import { Icon } from "@/components/ui";
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

type Status = "all" | "active" | "disabled";
const STATUS_LABEL: Record<Status, string> = { all: "כל הסטטוסים", active: "פעילים בלבד", disabled: "מושבתים בלבד" };

type Sort = "name" | "recent" | "newest";
const SORT_LABEL: Record<Sort, string> = { name: "שם", recent: "כניסה אחרונה", newest: "חדשים ביותר" };

const RANK: Record<RoleKey, number> = { admin: 0, doctor: 1, staff: 2, patient: 3, caregiver: 4 };
const dmy = (iso: string) => israelParts(iso).date.split("-").reverse().join(".");

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string; clinic?: string; status?: string; sort?: string }> }) {
  const sp = await searchParams;
  const active: Filter = FILTERS.some(([k]) => k === sp.role) ? (sp.role as Filter) : "all";
  const q = (sp.q ?? "").trim();
  const status: Status = sp.status === "active" || sp.status === "disabled" ? sp.status : "all";
  const sort: Sort = sp.sort === "recent" || sp.sort === "newest" ? sp.sort : "name";
  const { db } = await requireAdmin();

  const [{ data: profiles }, { data: clinics }, { data: admins }] = await Promise.all([
    db.from("profiles").select("id, clinic_id, role, full_name, disabled, created_at"),
    db.from("clinics").select("id, name"),
    db.from("platform_admins").select("user_id"),
  ]);

  const clinicOptions = (clinics ?? []).slice().sort((a, b) => (a.name as string).localeCompare(b.name as string, "he"));
  const clinicId = clinicOptions.some((c) => c.id === sp.clinic) ? (sp.clinic as string) : "";

  // Login names and last sign-in live in the auth system.
  const auth = new Map<string, { email: string; last: string | null; created: string | null }>();
  for (let page = 1; page <= 10; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    for (const u of users) auth.set(u.id, { email: u.email ?? "", last: u.last_sign_in_at ?? null, created: u.created_at ?? null });
    if (users.length < 1000) break;
  }

  const clinicName = new Map((clinics ?? []).map((c) => [c.id as string, c.name as string]));
  type Row = { id: string; name: string; role: RoleKey; clinicId: string | null; clinic: string; username: string; disabled: boolean; last: string | null; created: string | null };
  const rows: Row[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.role as RoleKey,
    clinicId: p.clinic_id ?? null,
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
    rows.push({ id: a.user_id, name: u?.email.split("@")[0] ?? "מנהל", role: "admin", clinicId: null, clinic: "—", username: u?.email.split("@")[0] ?? "", disabled: false, last: u?.last ?? null, created: u?.created ?? null });
  }

  const matchesQuery = (r: Row) => !q || `${r.name} ${r.username} ${r.clinic}`.toLowerCase().includes(q.toLowerCase());
  const inFilter = (r: Row, k: Filter) => k === "all" || r.role === k;
  const matchesClinic = (r: Row) => !clinicId || r.clinicId === clinicId;
  const matchesStatus = (r: Row) => status === "all" || (status === "disabled" ? r.disabled : !r.disabled);
  const passesAll = (r: Row, k: Filter) => inFilter(r, k) && matchesQuery(r) && matchesClinic(r) && matchesStatus(r);

  const sorters: Record<Sort, (a: Row, b: Row) => number> = {
    name: (a, b) => RANK[a.role] - RANK[b.role] || a.name.localeCompare(b.name, "he"),
    recent: (a, b) => (b.last ? new Date(b.last).getTime() : -1) - (a.last ? new Date(a.last).getTime() : -1),
    newest: (a, b) => (b.created ? new Date(b.created).getTime() : -1) - (a.created ? new Date(a.created).getTime() : -1),
  };

  const shown = rows.filter((r) => passesAll(r, active)).sort(sorters[sort]);
  const count = (k: Filter) => rows.filter((r) => passesAll(r, k)).length;
  const hasFilters = active !== "all" || !!q || !!clinicId || status !== "all";

  const href = (overrides: Partial<{ role: Filter; q: string; clinic: string; status: Status; sort: Sort }>) => {
    const next = { role: active, q, clinic: clinicId, status, sort, ...overrides };
    const params = new URLSearchParams();
    if (next.role !== "all") params.set("role", next.role);
    if (next.q) params.set("q", next.q);
    if (next.clinic) params.set("clinic", next.clinic);
    if (next.status !== "all") params.set("status", next.status);
    if (next.sort !== "name") params.set("sort", next.sort);
    const s = params.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };

  return (
    <main>
      <p className="eyebrow">{rows.length} משתמשים</p>
      <h1 className="display mt-1 text-4xl">משתמשים</h1>
      <p className="mt-2 text-muted">לחיצה על משתמש פותחת את המערכת כפי שהוא רואה אותה, בתצוגה בלבד. ניהול משתמשי צוות — השבתה, איפוס סיסמה — נעשה בכרטיס המרפאה.</p>

      <form role="search" className="mt-6 flex flex-wrap gap-2">
        {active !== "all" && <input type="hidden" name="role" value={active} />}
        <input name="q" type="search" enterKeyHint="search" autoComplete="off" defaultValue={q} className="field min-w-0 flex-1 basis-48" placeholder="שם, שם משתמש או מרפאה" aria-label="חיפוש משתמשים" />
        <select name="clinic" defaultValue={clinicId} className="field min-h-11 w-auto shrink-0" aria-label="סינון לפי מרפאה">
          <option value="">כל המרפאות</option>
          {clinicOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={status} className="field min-h-11 w-auto shrink-0" aria-label="סינון לפי סטטוס">
          {(Object.keys(STATUS_LABEL) as Status[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className="field min-h-11 w-auto shrink-0" aria-label="מיון">
          {(Object.keys(SORT_LABEL) as Sort[]).map((k) => <option key={k} value={k}>מיון: {SORT_LABEL[k]}</option>)}
        </select>
        <button className="btn btn-sm min-h-11 shrink-0 self-center">חיפוש</button>
        {hasFilters && <Link href="/admin/users" className="btn btn-quiet btn-sm min-h-11 shrink-0 self-center">איפוס סינון</Link>}
      </form>

      <nav aria-label="סינון לפי תפקיד" className="chip-row mt-4 flex-wrap! overflow-visible!">
        {FILTERS.map(([key, label]) => (
          <Link key={key} href={href({ role: key })} scroll={false} aria-current={key === active ? "page" : undefined} className="chip">
            {label} <span className="num text-xs">{count(key)}</span>
          </Link>
        ))}
      </nav>

      <p className="sr-only" role="status" aria-live="polite">{shown.length === 0 ? "אין משתמשים שמתאימים" : `מוצגים ${shown.length} משתמשים`}</p>

      {shown.length === 0 ? (
        <div className="card mt-6 px-4 py-12 text-center">
          <p className="font-medium">אין משתמשים שמתאימים לסינון</p>
          <p className="mt-1 text-sm text-muted">נסו לשנות את החיפוש, המרפאה או התפקיד.</p>
          {hasFilters && <Link href="/admin/users" className="btn mt-4 inline-flex">איפוס הסינון</Link>}
        </div>
      ) : (
        <ul className="card mt-2 divide-y divide-line">
          {shown.map((r) => {
            const body = (
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`min-w-0 break-words font-medium ${r.disabled ? "text-muted line-through" : ""}`}>{r.name}</span>
                  <span className={`pill ${ROLE_PILL[r.role]}`}>{ROLE_LABEL[r.role]}</span>
                  {r.disabled && <span className="pill pill-bad">מושבת</span>}
                  {r.role === "admin" && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Icon name="lock" size={12} /> אין תצוגה כמנהל מערכת
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
                  {r.clinic !== "—" && <span className="break-words">{r.clinic}</span>}
                  {r.username && <span dir="ltr" className="num break-all">{r.username}</span>}
                  <span>{r.last ? `כניסה אחרונה ${dmy(r.last)}` : "טרם נכנס"}</span>
                </p>
              </div>
            );
            // Tapping a user opens the system as they see it. Admins and disabled users cannot be opened.
            return r.role === "admin" || r.disabled ? (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">{body}</li>
            ) : (
              <ViewAsRow key={r.id} id={r.id} name={r.name}>{body}</ViewAsRow>
            );
          })}
        </ul>
      )}
    </main>
  );
}
