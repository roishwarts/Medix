import Link from "next/link";
import { getImpersonation } from "@/lib/impersonation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActivityList } from "@/components/activity-list";
import { GROUPS, toItems, type ActivityRow, type GroupKey } from "@/lib/activity";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ type?: string; patient?: string }> }) {
  const sp = await searchParams;
  const profile = await requireProfile(["staff", "doctor"]);
  const group = GROUPS.find((g) => g.key === sp.type) ?? GROUPS[0];
  const supabase = await createClient();

  let query = supabase
    .from("activity_events")
    .select("id, kind, actor_id, actor_name, actor_role, subject, detail, created_at, patient_id, journey_id")
    .order("created_at", { ascending: false })
    .limit(150);
  if (group.kinds) query = query.in("kind", group.kinds);
  if (group.roles) query = query.in("actor_role", group.roles);
  if (sp.patient) query = query.eq("patient_id", sp.patient);

  const [{ data: rows }, { data: patients }, { data: journeys }, { data: seen }] = await Promise.all([
    query,
    supabase.from("patients").select("id, full_name").order("full_name"),
    supabase.from("journeys").select("id, patient_id"),
    supabase.from("activity_seen").select("seen_at").eq("user_id", profile.id).maybeSingle(),
  ]);

  const items = toItems((rows ?? []) as ActivityRow[], {
    patientNames: new Map((patients ?? []).map((p) => [p.id as string, p.full_name as string])),
    journeyByPatient: new Map((journeys ?? []).map((j) => [j.patient_id as string, j.id as string])),
    me: profile.id,
    seenAt: seen?.seen_at ?? null,
  });

  const tabHref = (key: GroupKey) => {
    const p = new URLSearchParams();
    if (key !== "all") p.set("type", key);
    if (sp.patient) p.set("patient", sp.patient);
    const q = p.toString();
    return q ? `/clinic/activity?${q}` : "/clinic/activity";
  };

  return (
    <main>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="display text-4xl">עדכונים</h1>
          <p className="mt-1 text-muted">מה קרה אצל המטופלים, בני המשפחה והצוות.</p>
        </div>
        <form className="flex w-full items-end gap-2 sm:w-auto" action="/clinic/activity" role="search" aria-label="סינון לפי מטופל">
          {group.key !== "all" && <input type="hidden" name="type" value={group.key} />}
          <div className="min-w-0 flex-1 sm:flex-none">
            <label htmlFor="patient" className="lbl">מטופל</label>
            <select id="patient" name="patient" defaultValue={sp.patient ?? ""} className="field w-full sm:w-64">
              <option value="">כל המטופלים</option>
              {(patients ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <button className="btn btn-sm min-h-11 shrink-0">סינון</button>
        </form>
      </header>

      <nav aria-label="סינון עדכונים לפי סוג" className="chip-row mt-6 flex-wrap">
        {GROUPS.map((g) => {
          const on = g.key === group.key;
          return (
            <Link
              key={g.key}
              href={tabHref(g.key)}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className="chip min-h-11"
            >
              {g.label}
            </Link>
          );
        })}
      </nav>

      {/* An admin viewing as this person must not clear their unread markers. */}
      <ActivityList items={items} markSeen={!(await getImpersonation())} />
      {items.length >= 150 && <p role="status" className="mt-3 text-center text-sm text-muted">מוצגים 150 העדכונים האחרונים.</p>}
    </main>
  );
}
