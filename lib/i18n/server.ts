import { cache } from "react";
import { getLang } from "@/lib/prefs-server";
import { makeT, type T } from "./index";

// For server components: `const t = await getT();` then `t("עברית")`.
export const getT = cache(async (): Promise<T> => makeT(await getLang()));
