import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { israelParts } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { db } = await requireAdmin();
  const [{ data: clinics }, { data: people }, { data: patients }] = await Promise.all([
    db.from("clinics").select("id, name, created_at").order("created_at", { ascending: false }),
    db.from("profiles").select("clinic_id, role, full_name, disabled").in("role", ["doctor", "staff"]),
    db.from("patients").select("clinic_id"),
  ]);

  const count = (clinics ?? []).length;

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{count === 0 ? "אין מרפאות" : count === 1 ? "מרפאה אחת" : `${count} מרפאות`}</p>
          <h1 className="display mt-1 text-4xl">מרפאות</h1>
        </div>
        <Link href="/admin/clinics/new" className="btn btn-primary">מרפאה חדשה</Link>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">רשימת המרפאות</caption>
          <thead>
            <tr className="border-b border-line text-sm text-muted">
              <th scope="col" className="px-4 py-3 text-start font-medium">מרפאה</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">רופא</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">צוות</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium sm:table-cell">מטופלים</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium sm:table-cell">נוצרה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(clinics ?? []).map((c) => {
              const staff = (people ?? []).filter((p) => p.clinic_id === c.id);
              const doctors = staff.filter((p) => p.role === "doctor");
              const href = `/admin/clinics/${c.id}`;
              // Every cell is a link, so tapping anywhere on the row opens the clinic.
              const cell = "block min-h-12 break-words px-4 py-3.5";
              return (
                <tr key={c.id} className="link-row">
                  <td className="min-w-32"><Link href={href} className={`${cell} font-medium`}>{c.name}</Link></td>
                  <td className="min-w-24"><Link href={href} tabIndex={-1} className={`${cell} text-muted`}>{doctors.map((d) => d.full_name).join(", ") || "—"}</Link></td>
                  <td><Link href={href} tabIndex={-1} className={`${cell} num text-muted`}>{staff.length}</Link></td>
                  <td className="hidden whitespace-nowrap sm:table-cell"><Link href={href} tabIndex={-1} className={`${cell} num text-muted`}>{(patients ?? []).filter((p) => p.clinic_id === c.id).length}</Link></td>
                  <td className="hidden whitespace-nowrap sm:table-cell"><Link href={href} tabIndex={-1} className={`${cell} num text-muted`}><span dir="ltr">{israelParts(c.created_at).date.split("-").reverse().join(".")}</span></Link></td>
                </tr>
              );
            })}
            {(clinics ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted">אין מרפאות עדיין. לחצו על ״מרפאה חדשה״ כדי להתחיל.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
