import { requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/ui";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(["patient"]);
  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-5 pb-16">
      <header className="flex items-center justify-between py-4">
        <span className="text-sm text-muted">{profile.full_name}</span>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
