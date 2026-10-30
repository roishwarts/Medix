import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/admin";
import { israelParts } from "@/lib/dates";
import { UserRow } from "./user-row";
import { AddUserForm } from "./add-user-form";
import { AddTemplate } from "./add-template";
import { MfaToggle } from "./mfa-toggle";
import { ClinicOptions } from "./clinic-options";
import { ClinicAddress } from "./clinic-address";

export const dynamic = "force-dynamic";

export default async function ClinicPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data: clinic } = await db.from("clinics").select("*").eq("id", id).maybeSingle();
  if (!clinic) notFound();

  const [{ data: people }, { data: templates }, { data: bases }, { count: patientCount }, { data: options }] = await Promise.all([
    db.from("profiles").select("id, full_name, role, disabled").eq("clinic_id", id).in("role", ["doctor", "staff"]).order("role"),
    db.from("templates").select("id, name").eq("clinic_id", id).eq("is_base", false).order("name"),
    db.from("templates").select("id, name").eq("is_base", true).order("name"),
    db.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", id),
    db.from("clinic_options").select("id, kind, name").eq("clinic_id", id).order("name"),
  ]);

  const users = await Promise.all(
    (people ?? []).map(async (p) => {
      const { data } = await db.auth.admin.getUserById(p.id);
      const { data: f } = await db.auth.admin.mfa.listFactors({ userId: p.id });
      const mfa = (f?.factors ?? []).some((x) => x.status === "verified");
      return { ...p, username: data.user?.email?.split("@")[0] ?? "", mfa };
    }),
  );

  const h2 = "eyebrow mb-3";
  const note = "mt-3 text-sm text-muted";
  return (
    <main>
      <h1 className="display break-words text-3xl sm:text-4xl">{clinic.name}</h1>
      <p className="mt-1 text-muted">
        {t("נוצרה {date}", { date: israelParts(clinic.created_at).date.split("-").reverse().join(".") })} · {t("{n} מטופלים", { n: patientCount ?? 0 })}
      </p>

      <section className="mt-8" aria-labelledby="address-h">
        <h2 id="address-h" className={h2}>{t("מיקום המרפאה")}</h2>
        <ClinicAddress clinicId={id} initial={clinic.address ?? ""} />
      </section>

      <section className="mt-10" aria-label={t("אימות דו-שלבי")}>
        <MfaToggle clinicId={id} initial={!!clinic.mfa_required} />
      </section>

      <section className="mt-10" aria-labelledby="options-h">
        <h2 id="options-h" className={h2}>{t("בתי חולים וחברות")}</h2>
        <ClinicOptions
          clinicId={id}
          hospitals={(options ?? []).filter((o) => o.kind === "hospital")}
          companies={(options ?? []).filter((o) => o.kind === "company")}
        />
        <p className={note}>{t("הרופא והצוות בוחרים מהרשימות האלה לכל מטופל: באיזה בית חולים הפרוצדורה, ועם איזו חברה עובדים.")}</p>
      </section>

      <section className="mt-10" aria-labelledby="users-h">
        <h2 id="users-h" className={h2}>{t("משתמשי צוות")}</h2>
        {users.length > 0 ? (
          <ul className="card divide-y divide-line">
            {users.map((u) => (
              <UserRow key={u.id} id={u.id} name={u.full_name} username={u.username} role={u.role} disabled={u.disabled} mfa={u.mfa} />
            ))}
          </ul>
        ) : (
          <div className="card px-4 py-10 text-center">
            <p className="font-medium">{t("אין משתמשי צוות עדיין.")}</p>
            <p className="mt-1 text-muted">{t("הוספת רופא או איש צוות נוספים אפשרית למטה.")}</p>
          </div>
        )}
        <AddUserForm clinicId={id} />
      </section>

      <section className="mt-10" aria-labelledby="templates-h">
        <h2 id="templates-h" className={h2}>{t("תבניות של המרפאה")}</h2>
        {(templates ?? []).length > 0 ? (
          <ul className="card divide-y divide-line">
            {(templates ?? []).map((t) => <li key={t.id} className="break-words px-4 py-3">{t.name}</li>)}
          </ul>
        ) : (
          <div className="card px-4 py-10 text-center">
            <p className="font-medium">{t("אין תבניות עדיין.")}</p>
            <p className="mt-1 text-muted">{t("אפשר להוסיף עותק של תבנית בסיס, ולהתחיל ממנה.")}</p>
          </div>
        )}
        <p className={note}>{t("הרופא עורך את התבניות שלו בעצמו. כאן אפשר רק להוסיף עותק של תבנית בסיס.")}</p>
        <AddTemplate clinicId={id} bases={bases ?? []} />
      </section>
    </main>
  );
}
