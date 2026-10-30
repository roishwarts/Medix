"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/i18n-provider";

// Picking a hospital filters at once; the other filters in the address stay as they are.
export function HospitalFilter({ hospitals, hospital }: { hospitals: string[]; hospital?: string }) {
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  return (
    <select
      aria-label={t("בית חולים")} value={hospital ?? ""} className="field !min-h-9 w-auto max-w-[14rem] py-1 text-sm"
      onChange={(e) => {
        const p = new URLSearchParams(search.toString());
        if (e.target.value) p.set("hospital", e.target.value); else p.delete("hospital");
        const q = p.toString();
        router.push(q ? `${path}?${q}` : path, { scroll: false });
      }}
    >
      <option value="">{t("כל בתי החולים")}</option>
      {hospitals.map((h) => <option key={h} value={h}>{h}</option>)}
    </select>
  );
}
