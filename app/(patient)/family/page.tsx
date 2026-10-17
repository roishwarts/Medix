import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { israelParts } from "@/lib/dates";
import { CaregiverList } from "@/components/caregiver-list";
import { InviteForm } from "./invite-form";
import { InviteRow } from "./invite-row";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  await requireProfile(["patient"]);
  const supabase = await createClient();
  const [{ data: caregivers }, { data: invites }] = await Promise.all([
    supabase.from("patient_caregivers").select("id, full_name, relation, can_act, created_at").order("created_at"),
    supabase
      .from("caregiver_invites")
      .select("id, relation, can_act, expires_at")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="space-y-10">
      <div>
        <h1 className="display text-3xl">משפחה</h1>
        <p className="mt-2 text-muted">
          אפשר להזמין בן משפחה או מלווה לעקוב אחרי המסע, ואם תרצה/י גם לעזור בו. הם מקבלים כניסה משלהם, בלי הסיסמה שלך. המרפאה רואה מי מקושר ויכולה להסיר גישה.
        </p>
      </div>

      <section>
        <h2 className="eyebrow mb-3">מקושרים כרגע</h2>
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
        <section>
          <h2 className="eyebrow mb-3">הזמנות שממתינות</h2>
          <ul className="card divide-y divide-line">
            {invites!.map((i) => (
              <InviteRow key={i.id} id={i.id} relation={i.relation} canAct={i.can_act}
                expires={israelParts(i.expires_at).date.split("-").reverse().join(".")} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-3">הזמנת בן משפחה</h2>
        <InviteForm />
      </section>
    </main>
  );
}
