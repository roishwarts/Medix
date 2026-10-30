import type { Metadata } from "next";
import { getCaregiverLink, getClinicName, requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { AppHeader, type NavItem } from "@/components/app-header";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const name = await getClinicName();
  return { title: name || "כניסה" };
}

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(["patient", "caregiver"]);
  const caregiver = profile.role === "caregiver" ? await getCaregiverLink() : null;
  const clinicName = await getClinicName();
  const t = await getT();
  const items: NavItem[] = [
    { href: "/journey", label: t("ראשי") },
    { href: "/calendar", label: t("יומן") },
    ...(profile.role === "patient" ? [{ href: "/family", label: t("משפחה") }] : []),
  ];
  return (
    <div className="min-h-dvh pb-16">
      <ImpersonationBanner />
      <AppHeader items={items} brand={clinicName} home="/journey" logout={<LogoutButton />} greeting={t("שלום {name}", { name: profile.full_name })} maxWidth="max-w-5xl" />
      <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-5 sm:pt-6">
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
