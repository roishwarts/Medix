import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/invite";
import { AcceptForm } from "./form";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  let invite: { relation: string; can_act: boolean; patientFirstName: string } | null = null;
  if (admin) {
    const { data } = await admin
      .from("caregiver_invites")
      .select("relation, can_act, patients(full_name)")
      .eq("token_hash", hashToken(token))
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (data) {
      const p = (Array.isArray(data.patients) ? data.patients[0] : data.patients) as { full_name: string } | null;
      invite = { relation: data.relation, can_act: data.can_act, patientFirstName: (p?.full_name ?? "").split(" ")[0] };
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      {invite ? (
        <>
          <p className="eyebrow mb-3">הזמנה</p>
          <h1 className="display mb-2 text-3xl">הוזמנת לעקוב אחרי המסע של {invite.patientFirstName}</h1>
          <p className="mb-8 text-muted">
            כ{invite.relation}. {invite.can_act ? "תוכל/י לראות את המסע ולעזור בו." : "תוכל/י לראות את המסע."} צריך רק לבחור שם משתמש וסיסמה.
          </p>
          <AcceptForm token={token} />
        </>
      ) : (
        <>
          <h1 className="display mb-3 text-3xl">ההזמנה אינה תקפה</h1>
          <p className="text-muted">הקישור פג תוקף, בוטל, או כבר נוצל. בקש/י מהמטופל/ת הזמנה חדשה.</p>
        </>
      )}
    </main>
  );
}
