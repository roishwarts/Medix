import { requireAdmin } from "@/lib/admin";
import { LogoutButton } from "@/components/ui";
import { NavLink } from "@/components/nav-link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5">
          <nav className="flex gap-6">
            <NavLink href="/admin" exact>מרפאות</NavLink>
            <NavLink href="/admin/templates">תבניות בסיס</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:block">ניהול המערכת</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
    </div>
  );
}
