import { requireAdmin } from "@/lib/admin";
import { LogoutButton } from "@/components/logout-button";
import { AppHeader, type NavItem } from "@/components/app-header";

const ITEMS: NavItem[] = [
  { href: "/admin", label: "מרפאות", exact: true },
  { href: "/admin/templates", label: "תבניות בסיס" },
  { href: "/admin/users", label: "משתמשים" },
  { href: "/admin/dev-tasks", label: "משימות פיתוח" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <AppHeader items={ITEMS} brand="ניהול המערכת" home="/admin" logout={<LogoutButton />} languages={false} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">{children}</div>
    </div>
  );
}
