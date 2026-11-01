export const HMOS = ["clalit", "maccabi", "meuhedet", "leumit", "other"] as const;
export type Hmo = (typeof HMOS)[number];
export const HMO_LABEL: Record<Hmo, string> = {
  clalit: "כללית", maccabi: "מכבי", meuhedet: "מאוחדת", leumit: "לאומית", other: "אחר",
};
