import { getCaregiverLink, requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/ui";
import { NavLink } from "@/components/nav-link";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(["patient", "caregiver"]);
  const caregiver = profile.role === "caregiver" ? await getCaregiverLink() : null;
  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-5 pb-16">
      <header className="flex items-center justify-between pt-4">
        <span className="text-sm text-muted">{profile.full_name}</span>
        <LogoutButton />
      </header>
      <nav className="mb-6 flex gap-6 border-b border-line">
        <NavLink href="/journey">המסע</NavLink>
        <NavLink href="/calendar">יומן</NavLink>
        {profile.role === "patient" && <NavLink href="/family">משפחה</NavLink>}
      </nav>
      {profile.role === "caregiver" && (
        <p className="mb-6 rounded bg-accent-soft px-3 py-2 text-sm">
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
  );
}
