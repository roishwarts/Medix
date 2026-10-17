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

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{(clinics ?? []).length} מרפאות</p>
          <h1 className="display mt-1 text-4xl">מרפאות</h1>
        </div>
        <Link href="/admin/clinics/new" className="btn btn-primary">מרפאה חדשה</Link>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[34rem]">
          <thead>
            <tr className="border-b border-line text-sm text-muted">
              <th className="px-4 py-3 text-start font-medium">מרפאה</th>
              <th className="px-4 py-3 text-start font-medium">רופא</th>
              <th className="px-4 py-3 text-start font-medium">משתמשי צוות</th>
              <th className="px-4 py-3 text-start font-medium">מטופלים</th>
              <th className="px-4 py-3 text-start font-medium">נוצרה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(clinics ?? []).map((c) => {
              const staff = (people ?? []).filter((p) => p.clinic_id === c.id);
              const doctors = staff.filter((p) => p.role === "doctor");
              return (
                <tr key={c.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clinics/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{doctors.map((d) => d.full_name).join(", ") || "—"}</td>
                  <td className="num px-4 py-3 text-muted">{staff.length}</td>
                  <td className="num px-4 py-3 text-muted">{(patients ?? []).filter((p) => p.clinic_id === c.id).length}</td>
                  <td className="num px-4 py-3 text-muted">{israelParts(c.created_at).date.split("-").reverse().join(".")}</td>
                </tr>
              );
            })}
            {(clinics ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">אין מרפאות עדיין.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
