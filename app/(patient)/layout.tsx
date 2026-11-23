import { BackButton } from "@/components/back-button";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCaregiverLink, getClinicName, requireProfile } from "@/lib/auth";
import { getImpersonation } from "@/lib/impersonation";
import { LogoutButton } from "@/components/logout-button";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { BrandTheme } from "@/components/brand-theme";
import { FloatingSettingsButton } from "@/components/home-settings";
import { AppHeader, type NavItem } from "@/components/app-header";
import { getT } from "@/lib/i18n/server";
import { cookies } from "next/headers";
import { ClinicSidebar } from "@/components/clinic-sidebar";
import { RAIL_COOKIE } from "@/lib/rail";

export async function generateMetadata(): Promise<Metadata> {
  const name = await getClinicName();
  return { title: name || (await getT())("כניסה") };
}

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(["patient", "caregiver"]);
  // The welcome slides and the privacy consent come first, on every page (not only on "/"): a bookmark or the back
  // button must not skip them. An admin viewing as the patient is not the patient, so is not stopped.
  if (profile.role === "patient" && (!profile.onboarded_at || !profile.privacy_consent_at) && !(await getImpersonation())) redirect("/onboarding");
  const caregiver = profile.role === "caregiver" ? await getCaregiverLink() : null;
  const clinicName = await getClinicName();
  const t = await getT();
  const collapsed = (await cookies()).get(RAIL_COOKIE)?.value === "0";
  const items: NavItem[] = [
    { href: "/journey", label: t("ראשי"), icon: "home" },
    { href: "/calendar", label: t("יומן"), icon: "calendar" },
    ...(profile.role === "patient" ? [{ href: "/family", label: t("משפחה"), icon: "family" as const }] : []),
  ];
  return (
    <div className="clinic-shell min-h-dvh pb-24 md:pb-16" data-rail={collapsed ? "0" : "1"}>
      <BrandTheme brand={{ color: profile.brand_color, dark: profile.brand_dark, gold: profile.brand_gold }} />
      <ImpersonationBanner />
      <FloatingSettingsButton hideOn="/journey" />
      <ClinicSidebar quick={false} items={items} brand={clinicName} logo={profile.logo_url} userName={profile.full_name} roleLabel={profile.role === "caregiver" ? t("בן משפחה") : t("מטופל")} logout={<LogoutButton variant="rail" />} collapsed={collapsed} />
      <AppHeader desktopBar={false} items={items} home="/journey" brand={clinicName} logo={profile.logo_url} logout={<LogoutButton />} greeting={t("שלום {name}", { name: profile.full_name })} />
      <div className="clinic-main md:ps-[calc(var(--rail-w)+1.5rem)]">
      <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-5 sm:pt-6 md:px-10 md:pt-8">
      {profile.role === "caregiver" && (
        <p className="mb-6 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          {caregiver ? (
            <>
              {t("את/ה צופה במסע של")} <span className="font-medium">{caregiver.patient_name}</span> ({caregiver.relation}).{" "}
              {caregiver.can_act ? t("אפשר לשלוח משימות בשמו/ה. הטקסטים מנוסחים למטופל.") : t("מצב צפייה בלבד.")}
            </>
          ) : (
            t("החשבון הזה לא מקושר למטופל. פנה/י למטופל כדי לקבל הזמנה חדשה.")
          )}
        </p>
      )}
      <BackButton home="/journey" roots={items.map((i) => i.href)} />
      {children}
      </div>
      </div>
    </div>
  );
}
