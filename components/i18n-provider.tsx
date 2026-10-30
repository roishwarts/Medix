"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type T } from "@/lib/i18n";
import type { Lang } from "@/lib/prefs";

const Ctx = createContext<{ lang: Lang; t: T }>({ lang: "he", t: makeT("he") });

// Gives client components the same language the server used for this page.
export function I18nProvider({ lang, dict, children }: { lang: Lang; dict: Record<string, string>; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang, dict) }), [lang, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx).t;
export const useLang = () => useContext(Ctx).lang;
