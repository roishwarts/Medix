import type { T } from "./i18n";

// How a "surgeries within N days" time frame is written. Common ones read naturally; others fall back to days.
export function windowLabel(n: number, t: T): string {
  switch (n) {
    case 7: return t("בשבוע הקרוב");
    case 14: return t("בשבועיים הקרובים");
    case 21: return t("בשלושה שבועות הקרובים");
    case 30: return t("בחודש הקרוב");
    case 60: return t("בחודשיים הקרובים");
    case 90: return t("בשלושה חודשים הקרובים");
    default: return t("בתוך {n} ימים", { n });
  }
}
