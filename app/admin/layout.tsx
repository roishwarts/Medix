import { BackButton } from "@/components/back-button";
import { requireAdmin } from "@/lib/admin";
import { getT } from "@/lib/i18n/server";
import { LogoutButton } from "@/components/logout-button";
import { AppHeader, type NavItem } from "@/components/app-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  await requireAdmin();
  const ITEMS: NavItem[] = [
    { href: "/admin", label: t("מרפאות"), exact: true },
    { href: "/admin/templates", label: t("תבניות בסיס") },
    { href: "/admin/users", label: t("משתמשים") },
    { href: "/admin/dev-tasks", label: t("משימות פיתוח") },
  ];
  return (
    <div className="min-h-dvh">
      <AppHeader items={ITEMS} brand={t("ניהול המערכת")} home="/admin" logout={<LogoutButton />} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8"><BackButton home="/admin" />{children}</div>
    </div>
  );
}
