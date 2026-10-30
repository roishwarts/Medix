import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_PREFS, PREFS_COOKIE, parsePrefs, type Lang, type Prefs } from "./prefs";

export const getPrefs = cache(async (): Promise<Prefs> => parsePrefs((await cookies()).get(PREFS_COOKIE)?.value) ?? DEFAULT_PREFS);

// The language this request is rendered in: the viewer's choice from the accessibility menu.
export const getLang = cache(async (): Promise<Lang> => {
  return (await getPrefs()).lang;
});
