"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMyLanguage } from "@/app/lang-actions";
import { PREFS_COOKIE, dirOf, serializePrefs, type Prefs } from "@/lib/prefs";

const Ctx = createContext<{ prefs: Prefs; update: (patch: Partial<Prefs>) => void }>({
  prefs: { theme: "light", size: 1, lang: "he" },
  update: () => {},
});

export function PrefsProvider({ initial, children }: { initial: Prefs; children: React.ReactNode }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      document.cookie = `${PREFS_COOKIE}=${serializePrefs(next)}; path=/; max-age=31536000; samesite=lax`;
      const html = document.documentElement;
      html.dataset.theme = next.theme;
      html.dataset.size = String(next.size);
      return next;
    });
    if (patch.lang) {
      const html = document.documentElement;
      html.lang = patch.lang;
      html.dir = dirOf(patch.lang);
      void saveMyLanguage(patch.lang).finally(() => router.refresh()); // remember it for the clinic's messages, then render again
    }
  }, [router]);

  const value = useMemo(() => ({ prefs, update }), [prefs, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePrefs = () => useContext(Ctx);
