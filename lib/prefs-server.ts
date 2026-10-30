import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_PREFS, PREFS_COOKIE, hebrewOnly, parsePrefs, type Lang, type Prefs } from "./prefs";

export const getPrefs = cache(async (): Promise<Prefs> => parsePrefs((await cookies()).get(PREFS_COOKIE)?.value) ?? DEFAULT_PREFS);

// The language this request is rendered in (staff and admin areas are always Hebrew).
export const getLang = cache(async (): Promise<Lang> => {
  const path = (await headers()).get("x-medix-path") ?? "";
  if (hebrewOnly(path)) return "he";
  return (await getPrefs()).lang;
});
