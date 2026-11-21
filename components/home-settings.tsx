"use client";

import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/nav-icons";
import { useT } from "@/components/i18n-provider";

export const OPEN_SETTINGS_EVENT = "medix:open-settings";

// Placed on the same row as the page title. On phones the settings (accessibility, language, more pages, sign out) open from this button on the main page.
export function HomeSettingsButton({ home }: { home: string }) {
  const t = useT();
  const path = usePathname();
  if (path !== home) return null;
  return (
    <button
      type="button" aria-label={t("הגדרות")} title={t("הגדרות")} aria-haspopup="dialog"
      className="btn btn-quiet btn-icon size-11 shrink-0 md:hidden"
      onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
    >
      <NavIcon name="settings" size={22} />
    </button>
  );
}

// On every other page of the patient app (calendar, family, steps, a task) the settings, language, text size and
// sign out are reached from this small button at the top corner, phones only. The main page has its own, on the title row.
export function FloatingSettingsButton({ hideOn }: { hideOn: string }) {
  const t = useT();
  const path = usePathname();
  if (path === hideOn) return null;
  return (
    <button
      type="button" aria-label={t("הגדרות")} title={t("הגדרות")} aria-haspopup="dialog"
      className="btn btn-icon fixed end-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-30 size-11 md:hidden"
      onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
    >
      <NavIcon name="settings" size={22} />
    </button>
  );
}
