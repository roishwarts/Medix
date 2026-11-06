// Small helpers for the three shapes that keep showing up, ad hoc, everywhere a Supabase query
// result gets cast: Supabase's untyped client can't tell a to-one join from a to-many one, an
// aggregate `foo(count)` join, or a column a tiered-fallback select may not have selected.

// A to-one join comes back as either the object or a one-element array, depending on how Supabase
// inferred the relationship. Normalizes either into a single value or null.
export function oneOrNull<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

// `select("..., foo(count)")` always comes back as `[{ count: N }]` (or `[]`).
export function countOf(v: { count: number }[] | null | undefined): number {
  return v?.[0]?.count ?? 0;
}

// A column from a later patch that a tiered-fallback select may or may not have actually selected
// — reads back `null` either way instead of a one-off inline cast per call site.
export function optionalColumn<T>(row: object, key: string): T | null {
  return (row as Record<string, T | null | undefined>)[key] ?? null;
}
