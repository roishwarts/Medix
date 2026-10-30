import type { Metadata } from "next";
import { Suspense } from "react";
import { getClinicName, requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { AppHeader, type NavItem } from "@/components/app-header";
import { ActivityBadge } from "./activity-badge";

export async function generateMetadata(): Promise<Metadata> {
  const name = await getClinicName();
  return { title: name || "כניסה" };
}

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(["staff", "doctor"]);
  const clinicName = await getClinicName();
  const items: NavItem[] = [
    { href: "/clinic", label: "ראשי", exact: true },
    { href: "/clinic/tasks", label: "משימות" },
    { href: "/clinic/patients", label: "מטופלים" },
    { href: "/clinic/calendar", label: "יומן" },
    { href: "/clinic/activity", label: "עדכונים", badge: <Suspense fallback={null}><ActivityBadge /></Suspense> },
    ...(profile.role === "doctor" ? [{ href: "/clinic/templates", label: "תבניות" }] : []),
    { href: "/clinic/content", label: "תוכן למטופלים" },
  ];
  return (
    <div className="min-h-dvh">
      <ImpersonationBanner />
      <AppHeader items={items} brand={clinicName} home="/clinic" logout={<LogoutButton />} languages={false} greeting={`שלום ${profile.full_name}`} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">{children}</div>
    </div>
  );
}
