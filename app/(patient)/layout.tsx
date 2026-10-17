import { requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/ui";
import { NavLink } from "@/components/nav-link";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(["patient"]);
  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-5 pb-16">
      <header className="flex items-center justify-between pt-4">
        <span className="text-sm text-muted">{profile.full_name}</span>
        <LogoutButton />
      </header>
      <nav className="mb-6 flex gap-6 border-b border-line">
        <NavLink href="/journey">המסע</NavLink>
        <NavLink href="/calendar">יומן</NavLink>
      </nav>
      {children}
    </div>
  );
}
