import { PublicBrand } from "@/components/public-brand";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/invite";
import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { JoinForm } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("הצטרפות") };
}

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getT();
  const admin = createAdminClient();

  let info: { firstName: string; clinic: string } | null = null;
  if (admin) {
    const { data } = await admin
      .from("account_links")
      .select("patients(full_name, user_id), clinics(name)")
      .eq("token_hash", hashToken(token))
      .eq("purpose", "patient_join")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    const patient = (Array.isArray(data?.patients) ? data?.patients[0] : data?.patients) as { full_name: string; user_id: string | null } | null | undefined;
    const clinic = (Array.isArray(data?.clinics) ? data?.clinics[0] : data?.clinics) as { name: string } | null | undefined;
    if (patient && !patient.user_id) info = { firstName: patient.full_name.split(" ")[0], clinic: clinic?.name ?? "" };
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
      <PublicBrand logo />
      {info ? (
        <div className="card p-6 sm:p-8">
          {info.clinic && <p className="eyebrow mb-3">{info.clinic}</p>}
          <h1 className="display mb-2 text-3xl">{t("שלום {name}", { name: info.firstName })}</h1>
          <p className="mb-7 text-base leading-relaxed text-muted">{t("כאן עוקבים אחרי ההכנה לניתוח. צריך רק לבחור שם משתמש וסיסמה.")}</p>
          <JoinForm token={token} />
        </div>
      ) : (
        <div className="card p-6 text-center sm:p-8">
          <span className="pill-warn mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full" aria-hidden="true"><Icon name="clock" size={22} /></span>
          <h1 className="display mb-3 text-2xl">{t("הקישור אינו תקף")}</h1>
          <p className="mb-6 text-base leading-relaxed text-muted">{t("הקישור פג תוקף, הוחלף בחדש, או כבר נוצל. בקש/י מהמרפאה קישור חדש.")}</p>
          <Link href="/login" className="btn w-full">{t("כבר יש לך משתמש? כניסה")}</Link>
        </div>
      )}
    </main>
  );
}
