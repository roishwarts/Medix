"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@/components/ui";
import { useT } from "@/components/i18n-provider";

// Pages that have a sensible "up" even when nobody came from inside the app (a link opened directly).
const PARENT_OVERRIDES: Record<string, string> = { "/journey/tasks": "/journey", "/admin/clinics": "/admin" };
const parentOf = (path: string, home: string) => {
  const cut = path.replace(/\/[^/]+$/, "");
  const parent = PARENT_OVERRIDES[cut] ?? cut;
  return parent.startsWith(home) ? parent : home;
};

let pagesVisited = 0; // how many pages were opened inside the app, to know whether "back" can really go back

// Sits at the top of the page content (not in the top bar). Not shown on the main page of each area.
export function BackButton({ home }: { home: string }) {
  const t = useT();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => { pagesVisited += 1; }, [path]);
  if (path === home) return null;
  return (
    <button
      type="button"
      className="btn btn-quiet mb-4 -ms-3 min-h-11 gap-1.5 px-3"
      onClick={() => (pagesVisited > 1 ? router.back() : router.push(parentOf(path, home)))}
    >
      <span className="inline-flex -scale-x-100"><Icon name="arrow" size={18} /></span>
      {t("חזרה")}
    </button>
  );
}

