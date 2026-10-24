import type { Metadata } from "next";
import { getCaregiverLink, getClinicName, requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/ui";
import { NavLink } from "@/components/nav-link";
import { Greeting } from "@/components/greeting";

export async function generateMetadata(): Promise<Metadata> {
  const name = await getClinicName();
  return { title: name || "כניסה" };
}

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(["patient", "caregiver"]);
  const caregiver = profile.role === "caregiver" ? await getCaregiverLink() : null;
  const clinicName = await getClinicName();
  return (
    <div className="min-h-dvh pb-16">
      <div className="topbar">
        <div className="mx-auto w-full max-w-5xl px-5">
          <header className="flex items-center justify-between gap-3 pt-3">
            <Greeting name={profile.full_name} />
            <div className="flex shrink-0 items-center gap-1">
              <span className="max-w-[9rem] truncate text-sm text-muted">{clinicName}</span>
              <LogoutButton />
            </div>
          </header>
          <nav className="mt-1 flex gap-6">
            <NavLink href="/journey">ראשי</NavLink>
            <NavLink href="/calendar">יומן</NavLink>
            {profile.role === "patient" && <NavLink href="/family">משפחה</NavLink>}
          </nav>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl px-5 pt-6">
      {profile.role === "caregiver" && (
        <p className="mb-6 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          {caregiver ? (
            <>
              את/ה צופה במסע של <span className="font-medium">{caregiver.patient_name}</span> ({caregiver.relation}).{" "}
              {caregiver.can_act ? "אפשר לשלוח משימות בשמו/ה. הטקסטים מנוסחים למטופל." : "מצב צפייה בלבד."}
            </>
          ) : (
            "החשבון הזה לא מקושר למטופל. פנה/י למטופל כדי לקבל הזמנה חדשה."
          )}
        </p>
      )}
      {children}
      </div>
    </div>
  );
}
