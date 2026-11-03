import { BackButton } from "@/components/back-button";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { Suspense } from "react";
import { getClinicName, requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { BrandTheme } from "@/components/brand-theme";
import { AppHeader, type NavItem } from "@/components/app-header";
import { ActivityBadge } from "./activity-badge";
import { QuestionsBadge } from "./questions-badge";
import { PatientSearch } from "@/components/patient-search";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const name = await getClinicName();
  return { title: name || t("כניסה") };
}

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const clinicName = await getClinicName();
  const items: NavItem[] = [
    { href: "/clinic", label: t("ראשי"), icon: "home", exact: true },
    { href: "/clinic/tasks", label: t("משימות"), icon: "tasks" },
    { href: "/clinic/patients", label: t("מטופלים"), icon: "patients" },
    { href: "/clinic/calendar", label: t("יומן"), icon: "calendar" },
    { href: "/clinic/activity", label: t("עדכונים"), icon: "updates", badge: <Suspense fallback={null}><ActivityBadge /></Suspense> },
    { href: "/clinic/questions", label: t("שאלות לרופא"), icon: "question", more: true, badge: <Suspense fallback={null}><QuestionsBadge /></Suspense> },
    { href: "/clinic/insights", label: t("תובנות ניהול"), icon: "insights", more: true },
    ...(profile.role === "doctor" ? [{ href: "/clinic/templates", label: t("תבניות"), icon: "templates" as const, more: true }] : []),
    ...(profile.role === "doctor" ? [{ href: "/clinic/team", label: t("הצוות שלי"), icon: "users" as const, more: true }] : []),
    { href: "/clinic/content", label: t("תוכן למטופלים"), icon: "content", more: true },
  ];
  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <BrandTheme brand={{ color: profile.brand_color, dark: profile.brand_dark, gold: profile.brand_gold }} />
      <div className="print:hidden">
        <ImpersonationBanner />
        <AppHeader items={items} home="/clinic" brand={clinicName} logo={profile.logo_url} logout={<LogoutButton />} greeting={t("שלום {name}", { name: profile.full_name })} />
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
        <div className="flex items-start justify-between gap-2 print:hidden">
          <BackButton home="/clinic" roots={items.map((i) => i.href)} />
          {/* On a phone the top bar is hidden, so patient search sits here, on every page. */}
          <span className="ms-auto md:hidden"><PatientSearch /></span>
        </div>
        {children}
      </div>
    </div>
  );
}
