// Only parseDays is actually used (by the dashboard and the patients list, each with its own
// filter UI) - the PatientFilters component and DAY_PRESETS this file used to also export were
// dead code with no remaining callers, including a recurring !min-h-9 touch-target bug nobody
// could have reached anyway. Removed rather than fixed.

export function parseDays(v?: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 3650 ? Math.floor(n) : null;
}
