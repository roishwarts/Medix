import type { Lang } from "@/lib/prefs";
import { dictionaries } from "./dict";

export type Params = Record<string, string | number>;
export type T = (text: string, params?: Params) => string;

// The Hebrew sentence is the key. Without a translation (or in Hebrew) the sentence itself is shown.
export function makeT(lang: Lang, dict: Record<string, string> = lang === "he" ? {} : dictionaries[lang]): T {
  return (text, params) => {
    const out = dict[text] ?? text;
    return params ? out.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? "")) : out;
  };
}

export const dictionaryFor = (lang: Lang): Record<string, string> => (lang === "he" ? {} : dictionaries[lang]);
