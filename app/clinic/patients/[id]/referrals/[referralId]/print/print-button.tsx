"use client";

import { useT } from "@/components/i18n-provider";

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary print:hidden">
      {t("הדפסה")}
    </button>
  );
}
