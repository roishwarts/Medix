import { HomeSettingsButton } from "@/components/home-settings";
import { BackButton } from "@/components/back-button";
import { requireAdmin } from "@/lib/admin";
import { getT } from "@/lib/i18n/server";
import { LogoutButton } from "@/components/logout-button";
import { AppHeader, type NavItem } from "@/components/app-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  await requireAdmin();
  const ITEMS: NavItem[] = [
    { href: "/admin", label: t("מרפאות"), icon: "clinics", exact: true },
    { href: "/admin/templates", label: t("תבניות בסיס"), icon: "templates" },
    { href: "/admin/users", label: t("משתמשים"), icon: "users" },
    { href: "/admin/dev-tasks", label: t("משימות פיתוח"), icon: "dev" },
  ];
  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <AppHeader items={ITEMS} home="/admin" brand={t("ניהול המערכת")} logout={<LogoutButton />} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8"><HomeSettingsButton home="/admin" /><BackButton home="/admin" roots={ITEMS.map((i) => i.href)} />{children}</div>
    </div>
  );
}
