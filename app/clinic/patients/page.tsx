import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { formatDate, today } from "@/lib/dates";
import { ReadinessBar } from "@/components/ui";

export const dynamic = "force-dynamic";

type Search = { q?: string; notReady?: string; days?: string; past?: string };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const all = await loadJourneys();
  const t = today();
  const days = sp.days ? Number(sp.days) : null;

  const rows = all
    .filter((j) => (sp.past ? true : j.surgery_date >= t))
    .filter((j) => (sp.notReady ? j.summary.readiness < 100 : true))
    .filter((j) => (days ? j.summary.daysToSurgery <= days : true))
    .filter((j) => (sp.q ? j.patient.full_name.includes(sp.q.trim()) : true));

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{all.length} מטופלים במסלול</p>
          <h1 className="display mt-1 text-4xl">מטופלים</h1>
        </div>
        <Link href="/clinic/patients/new" className="btn btn-primary">מטופל חדש</Link>
      </div>

      <form className="card mt-6 flex flex-wrap items-end gap-4 p-4">
        <div className="min-w-44 flex-1">
          <label htmlFor="q" className="lbl">חיפוש שם</label>
          <input id="q" name="q" defaultValue={sp.q} className="field" />
        </div>
        <div>
          <label htmlFor="days" className="lbl">ניתוח בתוך</label>
          <select id="days" name="days" defaultValue={sp.days ?? ""} className="field">
            <option value="">הכול</option>
            <option value="7">7 ימים</option>
            <option value="14">14 ימים</option>
            <option value="30">30 ימים</option>
            <option value="60">60 ימים</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 pb-1.5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="notReady" value="1" defaultChecked={!!sp.notReady} className="size-4 accent-accent" /> לא מוכנים בלבד</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="past" value="1" defaultChecked={!!sp.past} className="size-4 accent-accent" /> כולל ניתוחים שעברו</label>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary">סינון</button>
          <Link href="/clinic/patients" className="btn btn-quiet">ניקוי</Link>
        </div>
      </form>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-start">
          <thead>
            <tr className="border-b border-line text-start text-sm text-muted">
              <th className="px-4 py-3 text-start font-medium">מטופל</th>
              <th className="px-4 py-3 text-start font-medium">ניתוח</th>
              <th className="px-4 py-3 text-start font-medium">מוכנות</th>
              <th className="px-4 py-3 text-start font-medium">שלב נוכחי</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((j) => (
              <tr key={j.id} className="hover:bg-paper">
                <td className="px-4 py-3">
                  <Link href={`/clinic/patients/${j.id}`} className="font-medium hover:underline">
                    {j.patient.full_name}
                  </Link>
                </td>
                <td className="num px-4 py-3 text-muted">
                  {formatDate(j.surgery_date)}
                  <span className="ms-2 text-xs">
                    {j.summary.daysToSurgery >= 0 ? `(${j.summary.daysToSurgery} ימים)` : "(עבר)"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="num w-10 font-medium">{j.summary.readiness}%</span>
                    <div className="w-20"><ReadinessBar value={j.summary.readiness} state={j.summary.readinessState} /></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted">{j.summary.topBlocker?.label ?? "ההכנות הושלמו"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">אין מטופלים שמתאימים לסינון.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
