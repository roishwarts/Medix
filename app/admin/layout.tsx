import { requireAdmin } from "@/lib/admin";
import { LogoutButton } from "@/components/logout-button";
import { NavLink } from "@/components/nav-link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="topbar">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-5">
          <nav className="order-2 flex min-w-0 gap-0.5 max-sm:w-full overflow-x-auto sm:order-1 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <NavLink href="/admin" exact>מרפאות</NavLink>
            <NavLink href="/admin/templates">תבניות בסיס</NavLink>
            <NavLink href="/admin/users">משתמשים</NavLink>
            <NavLink href="/admin/dev-tasks">משימות פיתוח</NavLink>
          </nav>
          <div className="order-1 flex items-center gap-2 max-sm:w-full max-sm:justify-between max-sm:pt-1 sm:order-2">
            <span className="text-sm text-muted">ניהול המערכת</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
    </div>
  );
}
