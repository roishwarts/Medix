"use client";

import { usePathname } from "next/navigation";

// The greeting belongs to the main page only.
export function Greeting({ name }: { name: string }) {
  const path = usePathname();
  if (path !== "/journey") return <span />;
  return <span className="display min-w-0 text-xl">שלום {name}</span>;
}
