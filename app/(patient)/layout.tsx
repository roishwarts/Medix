import type { Metadata } from "next";
import { getCaregiverLink, getClinicName, requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { NavLink } from "@/components/nav-link";

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
      <ImpersonationBanner />
      <div className="topbar">
        <div className="mx-auto w-full max-w-5xl px-5">
          <div className="flex items-center justify-between gap-3">
            <nav className="flex min-w-0 gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <NavLink href="/journey">ראשי</NavLink>
              <NavLink href="/calendar">יומן</NavLink>
              {profile.role === "patient" && <NavLink href="/family">משפחה</NavLink>}
            </nav>
            <div className="flex shrink-0 items-center gap-1">
              <span className="max-w-[7rem] text-center text-xs leading-tight text-muted sm:max-w-none sm:text-sm">{clinicName}</span>
              <LogoutButton />
            </div>
          </div>
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
