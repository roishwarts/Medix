import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/invite";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { ResetForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getT();
  const admin = createAdminClient();
  let valid = false;
  if (admin) {
    const { data } = await admin
      .from("account_links")
      .select("id")
      .eq("token_hash", hashToken(token))
      .eq("purpose", "password_reset")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    valid = !!data;
  }
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      {valid ? (
        <>
          <h1 className="display mb-2 text-3xl">{t("סיסמה חדשה")}</h1>
          <p className="mb-8 text-muted">{t("בחר/י סיסמה חדשה. אחרי השמירה תיכנס/י אוטומטית.")}</p>
          <ResetForm token={token} />
        </>
      ) : (
        <>
          <h1 className="display mb-3 text-3xl">{t("הקישור אינו תקף")}</h1>
          <p className="mb-8 text-muted">{t("הקישור פג תוקף או כבר נוצל. אפשר לבקש קישור חדש מדף הכניסה, דרך \"שכחתי סיסמה\".")}</p>
          <Link href="/forgot" className="btn btn-primary w-full">{t("בקשת קישור חדש")}</Link>
          <Link href="/login" className="btn btn-quiet mt-3 w-full">{t("חזרה לכניסה")}</Link>
        </>
      )}
    </main>
  );
}
