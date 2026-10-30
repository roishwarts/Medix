import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { israelParts } from "@/lib/dates";
import { CaregiverList } from "@/components/caregiver-list";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { InviteForm } from "./invite-form";
import { InviteRow } from "./invite-row";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  await requireProfile(["patient"]);
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const supabase = await createClient();
  const [{ data: caregivers }, { data: invites }] = await Promise.all([
    supabase.from("patient_caregivers").select("id, full_name, relation, can_act, created_at").order("created_at"),
    supabase
      .from("caregiver_invites")
      .select("id, invitee_name, relation, can_act, expires_at")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="display text-3xl">{t("משפחה")}</h1>
        <p className="mt-2 text-muted">
          {t("אפשר להזמין בן משפחה או מלווה לעקוב אחרי המסע, ואם תרצה/י גם לעזור בו. הם מקבלים כניסה משלהם, בלי הסיסמה שלך. המרפאה רואה מי מקושר ויכולה להסיר גישה.")}
        </p>
      </div>

      <section aria-labelledby="h-linked">
        <h2 id="h-linked" className="eyebrow mb-3">{t("מקושרים כרגע")}</h2>
        <CaregiverList
          isPatient
          items={(caregivers ?? []).map((c) => ({
            id: c.id,
            name: c.full_name,
            relation: c.relation,
            canAct: c.can_act,
            since: israelParts(c.created_at).date.split("-").reverse().join("."),
          }))}
        />
      </section>

      {(invites ?? []).length > 0 && (
        <section aria-labelledby="h-pending">
          <h2 id="h-pending" className="eyebrow mb-3">{t("הזמנות שממתינות")}</h2>
          <ul className="card divide-y divide-line">
            {invites!.map((i) => (
              <InviteRow key={i.id} id={i.id} name={i.invitee_name ?? ""} relation={i.relation} canAct={i.can_act}
                expires={israelParts(i.expires_at).date.split("-").reverse().join(".")} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="h-invite">
        <h2 id="h-invite" className="eyebrow mb-3">{t("הזמנת בן משפחה")}</h2>
        <InviteForm />
      </section>
    </main>
  );
}
