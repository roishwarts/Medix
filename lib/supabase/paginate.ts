const PAGE_SIZE = 1000;

// Supabase/PostgREST caps a single request at 1000 rows without erroring or saying so — a clinic-wide
// list that could grow past that (patients, journeys) would otherwise be silently cut off as the
// clinic grows. Pass a builder that accepts a [from, to] range; this keeps paging until a page comes
// back short.
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}
