import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { Suspense } from "react";
import { getClinicName, requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { AppHeader, type NavItem } from "@/components/app-header";
import { ActivityBadge } from "./activity-badge";

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
    { href: "/clinic", label: t("ראשי"), exact: true },
    { href: "/clinic/tasks", label: t("משימות") },
    { href: "/clinic/patients", label: t("מטופלים") },
    { href: "/clinic/calendar", label: t("יומן") },
    { href: "/clinic/activity", label: t("עדכונים"), badge: <Suspense fallback={null}><ActivityBadge /></Suspense> },
    ...(profile.role === "doctor" ? [{ href: "/clinic/templates", label: t("תבניות") }] : []),
    { href: "/clinic/content", label: t("תוכן למטופלים") },
  ];
  return (
    <div className="min-h-dvh">
      <ImpersonationBanner />
      <AppHeader items={items} brand={clinicName} home="/clinic" logout={<LogoutButton />} greeting={t("שלום {name}", { name: profile.full_name })} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">{children}</div>
    </div>
  );
}
