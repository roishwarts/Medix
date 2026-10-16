// Date-only helpers. All dates are "YYYY-MM-DD" strings, "today" is Israel time.

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

function toUtc(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function addDays(d: string, n: number): string {
  return new Date(toUtc(d) + n * 86400000).toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(a) - toUtc(b)) / 86400000);
}

export function formatDate(d: string): string {
  return new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(toUtc(d)),
  );
}

export function formatDateLong(d: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(toUtc(d)));
}

// "בעוד 3 ימים", "מחר", "היום", "לפני יומיים"
export function relativeDays(d: string, from = today()): string {
  const n = diffDays(d, from);
  if (n === 0) return "היום";
  if (n === 1) return "מחר";
  if (n === -1) return "אתמול";
  if (n === 2) return "מחרתיים";
  if (n === -2) return "לפני יומיים";
  return n > 0 ? `בעוד ${n} ימים` : `לפני ${-n} ימים`;
}
