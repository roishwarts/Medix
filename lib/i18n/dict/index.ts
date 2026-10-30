import type { Lang } from "@/lib/prefs";
import * as common from "./common";

// Every file in this folder adds translations for one area of the app. The Hebrew text is the key.
export type Shard = Record<Exclude<Lang, "he">, Record<string, string>>;
const shards: Shard[] = [common];

export const dictionaries: Shard = { en: {}, ru: {}, ar: {} };
for (const shard of shards) {
  for (const lang of ["en", "ru", "ar"] as const) Object.assign(dictionaries[lang], shard[lang]);
}
