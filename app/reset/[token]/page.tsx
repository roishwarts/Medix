import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/invite";
import { ResetForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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
          <h1 className="display mb-2 text-3xl">סיסמה חדשה</h1>
          <p className="mb-8 text-muted">בחר/י סיסמה חדשה. אחרי השמירה תיכנס/י אוטומטית.</p>
          <ResetForm token={token} />
        </>
      ) : (
        <>
          <h1 className="display mb-3 text-3xl">הקישור אינו תקף</h1>
          <p className="text-muted">הקישור פג תוקף או כבר נוצל. אפשר לבקש קישור חדש מדף הכניסה, דרך "שכחתי סיסמה".</p>
        </>
      )}
    </main>
  );
}
