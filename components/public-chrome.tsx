"use client";

import { usePathname } from "next/navigation";
import { AccessMenu } from "@/components/access-menu";

// On the sign-in and invitation pages (no top bar) the accessibility button floats in the corner.
const PUBLIC = ["/login", "/forgot", "/join/", "/invite/", "/reset/"];

export function PublicChrome() {
  const path = usePathname();
  if (!PUBLIC.some((p) => path === p || path.startsWith(p))) return null;
  return <div className="fixed end-3 top-3 z-[60]"><AccessMenu /></div>;
}
