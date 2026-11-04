import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActivityList } from "@/components/activity-list";
import { getT } from "@/lib/i18n/server";
import { addDays, israelLocalToIso, today } from "@/lib/dates";
import { GROUPS, toItems, type ActivityRow, type GroupKey } from "@/lib/activity";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Search = { type?: string; patient?: string; actor?: string; from?: string; to?: string; before?: string };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const group = GROUPS.find((g) => g.key === sp.type) ?? GROUPS[0];
  const supabase = await createClient();

  let query = supabase
    .from("activity_events")
    .select("id, kind, actor_id, actor_name, actor_role, subject, detail, created_at, patient_id, journey_id")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (group.kinds) query = query.in("kind", group.kinds);
  if (group.roles) query = query.in("actor_role", group.roles);
  if (sp.patient) query = query.eq("patient_id", sp.patient);
  if (sp.actor) query = query.eq("actor_id", sp.actor);
  if (sp.from) query = query.gte("created_at", israelLocalToIso(`${sp.from}T00:00`));
  if (sp.to) query = query.lt("created_at", israelLocalToIso(`${addDays(sp.to, 1)}T00:00`));
  if (sp.before) query = query.lt("created_at", sp.before);

  const [{ data: rows }, { data: patients }, { data: journeys }, { data: staff }, { data: seen }] = await Promise.all([
    query,
    supabase.from("patients").select("id, full_name").order("full_name"),
    supabase.from("journeys").select("id, patient_id"),
    supabase.from("profiles").select("id, full_name").eq("clinic_id", profile.clinic_id).in("role", ["staff", "doctor"]).order("full_name"),
    supabase.from("activity_seen").select("seen_at").eq("user_id", profile.id).maybeSingle(),
  ]);

  const allRows = (rows ?? []) as ActivityRow[];
  const hasMore = allRows.length > PAGE_SIZE;
  const pageRows = hasMore ? allRows.slice(0, PAGE_SIZE) : allRows;
  const nextCursor = pageRows[pageRows.length - 1]?.created_at;

  const items = toItems(pageRows, {
    t,
    patientNames: new Map((patients ?? []).map((p) => [p.id as string, p.full_name as string])),
    journeyByPatient: new Map((journeys ?? []).map((j) => [j.patient_id as string, j.id as string])),
    me: profile.id,
    seenAt: seen?.seen_at ?? null,
  });

  const baseParams = () => {
    const p = new URLSearchParams();
    if (group.key !== "all") p.set("type", group.key);
    if (sp.patient) p.set("patient", sp.patient);
    if (sp.actor) p.set("actor", sp.actor);
    if (sp.from) p.set("from", sp.from);
    if (sp.to) p.set("to", sp.to);
    return p;
  };
  const tabHref = (key: GroupKey) => {
    const p = baseParams();
    p.delete("type");
    if (key !== "all") p.set("type", key);
    const q = p.toString();
    return q ? `/clinic/activity?${q}` : "/clinic/activity";
  };
  const moreHref = () => {
    const p = baseParams();
    if (nextCursor) p.set("before", nextCursor);
    return `/clinic/activity?${p.toString()}`;
  };
  const hasFilters = !!(sp.patient || sp.actor || sp.from || sp.to);
  const weekAgo = addDays(today(), -6);
  const myWeekHref = (() => {
    const p = new URLSearchParams();
    if (group.key !== "all") p.set("type", group.key);
    p.set("actor", profile.id);
    p.set("from", weekAgo);
    p.set("to", today());
    return `/clinic/activity?${p.toString()}`;
  })();

  return (
    <main>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="display text-4xl">{t("עדכונים")}</h1>
        </div>
        <Link href={myWeekHref} className="text-sm text-muted hover:text-ink hover:underline">{t("מה עשיתי השבוע")}</Link>
      </header>

      <form className="mt-6 flex flex-wrap items-end gap-2" action="/clinic/activity" role="search" aria-label={t("סינון עדכונים")}>
        {group.key !== "all" && <input type="hidden" name="type" value={group.key} />}
        <div className="min-w-0 flex-1 sm:flex-none">
          <label htmlFor="patient" className="lbl">{t("מטופל")}</label>
          <select key={sp.patient ?? ""} id="patient" name="patient" defaultValue={sp.patient ?? ""} className="field w-full sm:w-52">
            <option value="">{t("כל המטופלים")}</option>
            {(patients ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div className="min-w-0 flex-1 sm:flex-none">
          <label htmlFor="actor" className="lbl">{t("איש צוות")}</label>
          <select key={sp.actor ?? ""} id="actor" name="actor" defaultValue={sp.actor ?? ""} className="field w-full sm:w-52">
            <option value="">{t("כל אנשי הצוות")}</option>
            {(staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        <div className="min-w-0 flex-1 sm:flex-none">
          <label htmlFor="from" className="lbl">{t("מתאריך")}</label>
          <input id="from" type="date" name="from" defaultValue={sp.from ?? ""} className="field w-full sm:w-40" />
        </div>
        <div className="min-w-0 flex-1 sm:flex-none">
          <label htmlFor="to" className="lbl">{t("עד תאריך")}</label>
          <input id="to" type="date" name="to" defaultValue={sp.to ?? ""} className="field w-full sm:w-40" />
        </div>
        <button className="btn btn-sm min-h-11 shrink-0">{t("סינון")}</button>
        {hasFilters && <Link href={group.key === "all" ? "/clinic/activity" : `/clinic/activity?type=${group.key}`} className="btn btn-quiet btn-sm min-h-11 shrink-0">{t("ניקוי סינון")}</Link>}
      </form>

      <nav aria-label={t("סינון עדכונים לפי סוג")} className="chip-row mt-6 flex-wrap">
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
              {t(g.label)}
            </Link>
          );
        })}
      </nav>

      <ActivityList items={items} markSeen={!sp.before} />
      {hasMore && (
        <div className="mt-4 text-center">
          <Link href={moreHref()} className="btn btn-sm">{t("הצגת {n} הבאים", { n: PAGE_SIZE })}</Link>
        </div>
      )}
    </main>
  );
}
