"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`my-1.5 rounded-full px-3.5 py-1.5 text-[15px] transition-colors ${active ? "glass-on font-medium text-ink" : "text-muted hover:bg-black/5 hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}
