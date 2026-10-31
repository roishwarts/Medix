export type Brand = { color: string | null; dark: string | null; gold: string | null };

const HEX = /^#[0-9a-fA-F]{6}$/;
export const hexOrNull = (v: unknown): string | null => (typeof v === "string" && HEX.test(v) ? v : null);

// Reads the three brand colors from a clinic row (columns that do not exist yet simply come back empty).
export function brandOf(row: { brand_color?: unknown; brand_dark?: unknown; brand_gold?: unknown } | null | undefined): Brand {
  return { color: hexOrNull(row?.brand_color), dark: hexOrNull(row?.brand_dark), gold: hexOrNull(row?.brand_gold) };
}
