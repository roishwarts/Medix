import { requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/ui";
import { NavLink } from "@/components/nav-link";

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(["staff", "doctor"]);
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5">
          <nav className="flex gap-6">
            <NavLink href="/clinic" exact>פעולות השבוע</NavLink>
            <NavLink href="/clinic/patients">מטופלים</NavLink>
            <NavLink href="/clinic/calendar">יומן</NavLink>
            {profile.role === "doctor" && <NavLink href="/clinic/templates">תבניות</NavLink>}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:block">
              {profile.full_name} · {profile.role === "doctor" ? "רופא" : "צוות"}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
    </div>
  );
}
