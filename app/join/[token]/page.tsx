import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/invite";
import { JoinForm } from "./form";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      {info ? (
        <>
          {info.clinic && <p className="eyebrow mb-3">{info.clinic}</p>}
          <h1 className="display mb-2 text-3xl">שלום {info.firstName}</h1>
          <p className="mb-8 text-muted">כאן עוקבים אחרי ההכנה לניתוח. צריך רק לבחור שם משתמש וסיסמה.</p>
          <JoinForm token={token} />
        </>
      ) : (
        <>
          <h1 className="display mb-3 text-3xl">הקישור אינו תקף</h1>
          <p className="text-muted">הקישור פג תוקף, הוחלף בחדש, או כבר נוצל. בקש/י מהמרפאה קישור חדש.</p>
        </>
      )}
    </main>
  );
}
