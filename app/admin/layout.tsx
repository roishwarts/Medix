import { BackButton } from "@/components/back-button";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { getProfile } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { LogoutButton } from "@/components/logout-button";
import { AppHeader, type NavItem } from "@/components/app-header";
import { ClinicSidebar } from "@/components/clinic-sidebar";
import { RAIL_COOKIE } from "@/lib/rail";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  await requireAdmin();
  const profile = await getProfile();
  const collapsed = (await cookies()).get(RAIL_COOKIE)?.value === "0";
  const ITEMS: NavItem[] = [
    { href: "/admin", label: t("מרפאות"), icon: "clinics", exact: true },
    { href: "/admin/templates", label: t("תבניות בסיס"), icon: "templates" },
    { href: "/admin/users", label: t("משתמשים"), icon: "users" },
    { href: "/admin/dev-tasks", label: t("משימות פיתוח"), icon: "dev" },
  ];
  return (
    <div className="clinic-shell min-h-dvh pb-24 md:pb-0" data-rail={collapsed ? "0" : "1"}>
      <ClinicSidebar quick={false} items={ITEMS} brand={t("ניהול המערכת")} userName={profile?.full_name ?? t("מנהל מערכת")} roleLabel={t("מנהל מערכת")} logout={<LogoutButton variant="rail" />} collapsed={collapsed} />
      <AppHeader desktopBar={false} items={ITEMS} home="/admin" brand={t("ניהול המערכת")} logout={<LogoutButton />} />
      <div className="clinic-main md:ps-[calc(var(--rail-w)+1.5rem)]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8 md:px-10 md:pt-[calc(1.65rem+1px)]"><BackButton home="/admin" roots={ITEMS.map((i) => i.href)} />{children}</div>
      </div>
    </div>
  );
}
