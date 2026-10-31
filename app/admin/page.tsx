import { HomeSettingsButton } from "@/components/home-settings";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/admin";
import { israelParts } from "@/lib/dates";
import { Icon } from "@/components/ui";
import { fetchAllRows } from "@/lib/supabase/paginate";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const t = await getT();
  const { db } = await requireAdmin();
  // profiles and patients are platform-wide (every clinic), so they're the ones most likely to grow
  // past Supabase's 1000-row-per-request cap as more clinics join — paged defensively.
  const [{ data: clinics, error: clinicsError }, people, patients] = await Promise.all([
    db.from("clinics").select("id, name, created_at").order("created_at", { ascending: false }),
    fetchAllRows<{ clinic_id: string; role: "doctor" | "staff"; full_name: string; disabled: boolean }>((from, to) =>
      db.from("profiles").select("clinic_id, role, full_name, disabled").in("role", ["doctor", "staff"]).range(from, to),
    ),
    fetchAllRows<{ clinic_id: string }>((from, to) => db.from("patients").select("clinic_id").range(from, to)),
  ]);

  if (clinicsError) {
    return (
      <main>
        <h1 className="display text-4xl">{t("מרפאות")}</h1>
        <p role="alert" className="card mt-6 p-4 text-bad">
          {t("שגיאה בטעינת רשימת המרפאות. נסו לרענן את הדף.")}
        </p>
      </main>
    );
  }

  const count = (clinics ?? []).length;
  const rows = (clinics ?? []).map((c) => {
    const staff = people.filter((p) => p.clinic_id === c.id);
    const doctors = staff.filter((p) => p.role === "doctor");
    return { clinic: c, staff, doctors, patientCount: patients.filter((p) => p.clinic_id === c.id).length };
  });
  const noDoctorCount = rows.filter((r) => r.doctors.length === 0).length;

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">{count === 0 ? t("אין מרפאות") : count === 1 ? t("מרפאה אחת") : t("{n} מרפאות", { n: count })}</p>
            {noDoctorCount > 0 && (
              <span className="pill pill-bad">
                <Icon name="alert" size={12} />
                {noDoctorCount === 1 ? t("מרפאה אחת ללא רופא") : t("{n} מרפאות ללא רופא", { n: noDoctorCount })}
              </span>
            )}
          </div>
          <h1 className="display mt-1 text-4xl">{t("מרפאות")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <HomeSettingsButton home="/admin" />
          <Link href="/admin/clinics/new" className="btn btn-primary">
            <Icon name="plus" size={14} />
            {t("מרפאה חדשה")}
          </Link>
        </div>
      </div>

      {count === 0 ? (
        <div className="card mt-6 px-4 py-12 text-center">
          <p className="font-medium">{t("אין מרפאות עדיין")}</p>
          <p className="mt-1 text-sm text-muted">{t("כל המרפאות שתיצרו יופיעו כאן.")}</p>
          <Link href="/admin/clinics/new" className="btn btn-primary mt-4 inline-flex">
            <Icon name="plus" size={14} />
            {t("יצירת מרפאה ראשונה")}
          </Link>
        </div>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">{t("רשימת המרפאות")}</caption>
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                <th scope="col" className="px-4 py-3 text-start font-medium">{t("מרפאה")}</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">{t("רופא")}</th>
                <th scope="col" className="px-4 py-3 text-start font-medium">{t("צוות")}</th>
                <th scope="col" className="hidden px-4 py-3 text-start font-medium sm:table-cell">{t("מטופלים")}</th>
                <th scope="col" className="hidden px-4 py-3 text-start font-medium sm:table-cell">{t("נוצרה")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ clinic: c, staff, doctors, patientCount }) => {
                const href = `/admin/clinics/${c.id}`;
                // Every cell is a link, so tapping anywhere on the row opens the clinic.
                const cell = "block min-h-12 break-words px-4 py-3.5";
                return (
                  <tr key={c.id} className="link-row">
                    <td className="min-w-32">
                      <Link href={href} className={`${cell} flex flex-wrap items-center gap-2 font-medium`}>
                        {c.name}
                        {doctors.length === 0 && <span className="pill pill-bad">{t("ללא רופא")}</span>}
                      </Link>
                    </td>
                    <td className="min-w-24"><Link href={href} tabIndex={-1} className={`${cell} text-muted`}>{doctors.map((d) => d.full_name).join(", ") || "—"}</Link></td>
                    <td><Link href={href} tabIndex={-1} className={`${cell} num text-muted`}>{staff.length}</Link></td>
                    <td className="hidden whitespace-nowrap sm:table-cell"><Link href={href} tabIndex={-1} className={`${cell} num text-muted`}>{patientCount}</Link></td>
                    <td className="hidden whitespace-nowrap sm:table-cell"><Link href={href} tabIndex={-1} className={`${cell} num text-muted`}><span dir="ltr">{israelParts(c.created_at).date.split("-").reverse().join(".")}</span></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
