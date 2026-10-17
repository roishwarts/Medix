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

// ---- calendar helpers

export function weekday(d: string): number {
  return new Date(toUtc(d)).getUTCDay(); // 0 = Sunday
}

export function startOfWeek(d: string): string {
  return addDays(d, -weekday(d));
}

export function addMonths(d: string, n: number): string {
  const [y, m] = d.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return t.toISOString().slice(0, 10);
}

export function monthTitle(d: string): string {
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(toUtc(d)),
  );
}

// Narrow weekday names, Sunday first: א׳ ב׳ ג׳ ...
export function weekdayNames(): string[] {
  const fmt = new Intl.DateTimeFormat("he-IL", { weekday: "narrow", timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 7 + i))));
}

export function dayLabel(d: string): string {
  return new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(toUtc(d)),
  );
}

const israelFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// An ISO timestamp as Israel date ("YYYY-MM-DD") and time ("HH:mm").
export function israelParts(iso: string): { date: string; time: string } {
  const p = Object.fromEntries(israelFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

// "YYYY-MM-DDTHH:mm" typed as Israel local time -> ISO timestamp (UTC).
export function israelLocalToIso(local: string): string {
  const [d, t] = local.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  const target = Date.UTC(y, m - 1, day, h, mi);
  let utc = target;
  for (let i = 0; i < 2; i++) {
    const p = israelParts(new Date(utc).toISOString());
    const [py, pm, pd] = p.date.split("-").map(Number);
    const [ph, pmin] = p.time.split(":").map(Number);
    utc -= Date.UTC(py, pm - 1, pd, ph, pmin) - target;
  }
  return new Date(utc).toISOString();
}
