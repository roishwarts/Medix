import type { Metadata } from "next";
import { getClinicName, requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/ui";
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
      <header className="topbar">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5">
          <div className="flex min-w-0 items-center gap-8">
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
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-sm text-muted sm:block">{clinicName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
    </div>
  );
}
