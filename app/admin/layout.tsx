import { requireAdmin } from "@/lib/admin";
import { LogoutButton } from "@/components/ui";
import { NavLink } from "@/components/nav-link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="topbar">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5">
          <nav className="flex min-w-0 gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <NavLink href="/admin" exact>מרפאות</NavLink>
            <NavLink href="/admin/templates">תבניות בסיס</NavLink>
            <NavLink href="/admin/users">משתמשים</NavLink>
            <NavLink href="/admin/dev-tasks">משימות פיתוח</NavLink>
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
