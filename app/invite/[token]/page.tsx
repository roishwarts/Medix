import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/invite";
import { getT } from "@/lib/i18n/server";
import { AcceptForm } from "./form";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("הצטרפות כבן משפחה") };
}

type Invite = {
  name: string;
  relation: string;
  can_act: boolean;
  patientFirstName: string;
  inviter: string;
  clinic: string;
};

function Shell({ clinic, children }: { clinic?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6 sm:py-12">
      {clinic && <p className="mb-4 text-center text-sm font-medium text-muted">{clinic}</p>}
      <div className="card p-6 sm:p-8">{children}</div>
    </main>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getT();
  const admin = createAdminClient();

  let invite: Invite | null = null;
  if (admin) {
    const { data } = await admin
      .from("caregiver_invites")
      .select("invitee_name, relation, can_act, created_by, clinic_id, patients(full_name)")
      .eq("token_hash", hashToken(token))
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (data) {
      const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v) ?? null;
      const p = one(data.patients as { full_name: string } | { full_name: string }[] | null);
      const { data: c } = await admin.from("clinics").select("name").eq("id", data.clinic_id).maybeSingle();
      const { data: inviterRow } = await admin.from("profiles").select("full_name").eq("id", data.created_by).maybeSingle();
      invite = {
        name: data.invitee_name ?? "",
        relation: data.relation,
        can_act: data.can_act,
        patientFirstName: (p?.full_name ?? "").split(" ")[0],
        inviter: inviterRow?.full_name ?? "",
        clinic: c?.name ?? "",
      };
    }
  }

  if (!invite) {
    return (
      <Shell>
        <h1 className="display mb-3 text-2xl sm:text-3xl">{t("ההזמנה אינה תקפה")}</h1>
        <p className="mb-6 text-muted">{t("הקישור פג תוקף, בוטל, או כבר נוצל. אפשר לבקש מהמטופל/ת או מהמרפאה הזמנה חדשה.")}</p>
        <p className="mb-6 text-sm text-muted">{t("כבר יש לך חשבון? אפשר להיכנס ישירות.")}</p>
        <Link href="/login" className="btn btn-primary w-full">{t("למסך הכניסה")}</Link>
      </Shell>
    );
  }

  return (
    <Shell clinic={invite.clinic}>
      <p className="eyebrow mb-2">{t("הזמנה להצטרף")}</p>
      <h1 className="display mb-3 text-2xl leading-snug sm:text-3xl">
        {t("הוזמנת לעקוב אחרי המסע של {name}", { name: invite.patientFirstName })}
      </h1>
      <p className="mb-5 text-muted">
        {invite.inviter ? <>{t("{name} מזמינ/ה אותך להצטרף.", { name: invite.inviter })} </> : null}
        {t("כדי להתחיל, צריך רק לבחור שם משתמש וסיסמה.")}
      </p>
      <dl className="mb-6 divide-y divide-line rounded-2xl border border-line bg-surface/60 text-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-muted">{t("קרבה")}</dt>
          <dd className="font-medium">{invite.relation}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-muted">{t("הרשאה")}</dt>
          <dd className="text-end font-medium">{invite.can_act ? t("צפייה בהכנות ועזרה בהן") : t("צפייה בהכנות בלבד")}</dd>
        </div>
      </dl>
      <AcceptForm token={token} defaultName={invite.name} />
    </Shell>
  );
}
