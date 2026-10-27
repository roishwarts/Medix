import type { Metadata } from "next";
import { getClinicName, requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/ui";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { Suspense } from "react";
import { NavLink } from "@/components/nav-link";
import { ActivityBadge } from "./activity-badge";

export async function generateMetadata(): Promise<Metadata> {
  const name = await getClinicName();
  return { title: name || "כניסה" };
}

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(["staff", "doctor"]);
  const clinicName = await getClinicName();
  return (
    <div className="min-h-dvh">
      <ImpersonationBanner />
      <header className="topbar">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 px-5">
          <div className="order-2 flex min-w-0 items-center gap-8 max-sm:w-full sm:order-1">
          <span className="display hidden text-lg md:block">שלום {profile.full_name}</span>
          <nav className="flex min-w-0 gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] sm:gap-1 [&::-webkit-scrollbar]:hidden">
            <NavLink href="/clinic" exact>ראשי</NavLink>
            <NavLink href="/clinic/patients">מטופלים</NavLink>
            <NavLink href="/clinic/calendar">יומן</NavLink>
            <NavLink href="/clinic/activity">
              עדכונים
              <Suspense fallback={null}>
                <ActivityBadge />
              </Suspense>
            </NavLink>
            {profile.role === "doctor" && <NavLink href="/clinic/templates">תבניות</NavLink>}
          </nav>
          </div>
          <div className="order-1 flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-between max-sm:pt-1 sm:order-2">
            <span className="text-sm text-muted">{clinicName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
    </div>
  );
}
