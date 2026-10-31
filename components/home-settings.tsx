"use client";

import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/nav-icons";
import { useT } from "@/components/i18n-provider";

export const OPEN_SETTINGS_EVENT = "medix:open-settings";

// On phones the settings (accessibility, language, more pages, sign out) open from this button on the main page.
export function HomeSettingsButton({ home }: { home: string }) {
  const t = useT();
  const path = usePathname();
  if (path !== home) return null;
  return (
    <div className="-mt-3 mb-1 flex justify-end md:hidden">
      <button
        type="button" aria-label={t("הגדרות")} title={t("הגדרות")} aria-haspopup="dialog"
        className="btn btn-quiet btn-icon size-11"
        onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
      >
        <NavIcon name="settings" size={22} />
      </button>
    </div>
  );
}
