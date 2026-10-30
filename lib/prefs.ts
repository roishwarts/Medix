// What each person chose in the accessibility menu: colors, text size and language. Stored in a cookie
// so the server can render the right look and language from the first byte (no flash).
export type Theme = "light" | "dark" | "system";
export type Lang = "he" | "en" | "ru" | "ar";
export type Prefs = { theme: Theme; size: 0 | 1 | 2 | 3 | 4; lang: Lang };

export const PREFS_COOKIE = "medix_prefs";
export const DEFAULT_PREFS: Prefs = { theme: "light", size: 1, lang: "he" };

export const LANGS: { code: Lang; label: string; dir: "rtl" | "ltr" }[] = [
  { code: "he", label: "עברית", dir: "rtl" },
  { code: "en", label: "English", dir: "ltr" },
  { code: "ru", label: "Русский", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export const dirOf = (lang: Lang) => LANGS.find((l) => l.code === lang)?.dir ?? "rtl";

export function parsePrefs(raw: string | undefined | null): Prefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Partial<Prefs>;
    return {
      theme: v.theme === "dark" || v.theme === "system" ? v.theme : "light",
      size: v.size === 0 || v.size === 2 || v.size === 3 || v.size === 4 ? v.size : 1,
      lang: v.lang === "en" || v.lang === "ru" || v.lang === "ar" ? v.lang : "he",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export const serializePrefs = (p: Prefs) => encodeURIComponent(JSON.stringify(p));

// The staff and admin screens are written in Hebrew only, whatever language was chosen for the patient screens.
export const hebrewOnly = (path: string) => path.startsWith("/clinic") || path.startsWith("/admin") || path.startsWith("/mfa");
