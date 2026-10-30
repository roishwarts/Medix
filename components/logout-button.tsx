import { logout } from "@/app/login/actions";
import { getImpersonation } from "@/lib/impersonation";
import { getT } from "@/lib/i18n/server";

// Server-only (it reads the session cookie), so it lives apart from the shared UI pieces that client components import.
export async function LogoutButton() {
  const t = await getT();
  if (await getImpersonation()) return <a href="/impersonate/exit" className="btn btn-sm w-full md:w-auto">חזרה לניהול</a>;
  return (
    <form action={logout}>
      <button className="btn btn-sm min-h-11 w-full md:w-auto md:min-h-9">{t("יציאה")}</button>
    </form>
  );
}
