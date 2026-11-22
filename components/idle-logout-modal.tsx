"use client";

import { useT } from "@/components/i18n-provider";
import { useIdleLogout } from "@/lib/idle-logout";
// Signs out through the /logout route (never blocked, also in a read-only "view as" session), then shows the login page.
async function signOutNow() {
  try { await fetch("/logout", { method: "POST", redirect: "manual" }); } catch { /* offline: the login page below still loads when back online */ }
  window.location.assign("/login");
}

// Mounted once per signed-in area that handles patient data (currently just /clinic). Not shown
// to patients themselves - the scope this round is staff/secretary only.
export function IdleLogoutModal() {
  const t = useT();
  const { warning, stay } = useIdleLogout(true, () => { void signOutNow(); });

  if (warning <= 0) return null;
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/40 p-4" role="alertdialog" aria-modal="true" aria-label={t("עדיין כאן?")}>
      <div tabIndex={-1} className="card w-full max-w-sm space-y-3 bg-[var(--color-surface)] p-5 text-center shadow-2xl outline-none">
        <h2 className="display text-lg">{t("עדיין כאן?")}</h2>
        <p className="text-sm text-muted">
          {t("לא נגעת במסך זמן רב. להגנה על פרטי המטופלים תתבצע התנתקות אוטומטית בעוד {n} שניות.", { n: warning })}
        </p>
        <button type="button" className="btn btn-primary w-full" autoFocus onClick={stay}>{t("כן, אני כאן")}</button>
      </div>
    </div>
  );
}
