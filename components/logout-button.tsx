import { getImpersonation } from "@/lib/impersonation";
import { getT } from "@/lib/i18n/server";

const OUT_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 8l-4 4 4 4M6 12h10" />
  </svg>
);

// Server-only (it reads the session cookie), so it lives apart from the shared UI pieces that client components import.
// variant "rail": the row at the bottom of the staff side menu (an icon, and the word while the menu is wide).
export async function LogoutButton({ variant = "button" }: { variant?: "button" | "rail" }) {
  const t = await getT();
  const impersonating = await getImpersonation();
  if (variant === "rail") {
    const label = impersonating ? t("חזרה לניהול") : t("יציאה");
    const body = <>{OUT_ICON}<span className="rail-label">{label}</span></>;
    if (impersonating) return <a href="/impersonate/exit" data-tip={label} aria-label={label} className="rail-item w-full">{body}</a>;
    return (
      <form action="/logout" method="post">
        <button data-tip={label} aria-label={label} className="rail-item w-full">{body}</button>
      </form>
    );
  }
  if (impersonating) return <a href="/impersonate/exit" className="btn btn-sm w-full md:w-auto">{t("חזרה לניהול")}</a>;
  return (
    <form action="/logout" method="post">
      <button className="btn btn-sm min-h-11 w-full md:w-auto md:min-h-9">{t("יציאה")}</button>
    </form>
  );
}
