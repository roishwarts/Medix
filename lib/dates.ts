import type { Lang } from "@/lib/prefs";

// Date-only helpers. All dates are "YYYY-MM-DD" strings, "today" is Israel time.

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

function toUtc(d: string): number {
  // A full timestamp ("2026-10-31T10:12:00+00:00") is accepted too: only its date part is used.
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function addDays(d: string, n: number): string {
  return new Date(toUtc(d) + n * 86400000).toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(a) - toUtc(b)) / 86400000);
}

export const LOCALE: Record<Lang, string> = { he: "he-IL", en: "en-GB", ru: "ru-RU", ar: "ar" };

export function formatDate(d: string, lang: Lang = "he"): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(toUtc(d)),
  );
}

export function formatDateLong(d: string, lang: Lang = "he"): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(toUtc(d)));
}

// "בעוד 3 ימים", "מחר", "היום", "לפני יומיים"
const REL: Record<Lang, { today: string; tomorrow: string; yesterday: string; in2: string; ago2: string; inN: (n: number) => string; agoN: (n: number) => string }> = {
  he: { today: "היום", tomorrow: "מחר", yesterday: "אתמול", in2: "מחרתיים", ago2: "לפני יומיים", inN: (n) => `בעוד ${n} ימים`, agoN: (n) => `לפני ${n} ימים` },
  en: { today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday", in2: "In 2 days", ago2: "2 days ago", inN: (n) => `In ${n} days`, agoN: (n) => `${n} days ago` },
  ru: { today: "Сегодня", tomorrow: "Завтра", yesterday: "Вчера", in2: "Послезавтра", ago2: "2 дня назад", inN: (n) => `Через ${n} дн.`, agoN: (n) => `${n} дн. назад` },
  ar: { today: "اليوم", tomorrow: "غدًا", yesterday: "أمس", in2: "بعد غد", ago2: "قبل يومين", inN: (n) => `بعد ${n} يومًا`, agoN: (n) => `قبل ${n} يومًا` },
};

export function relativeDays(d: string, from = today(), lang: Lang = "he"): string {
  const n = diffDays(d, from);
  const r = REL[lang];
  if (n === 0) return r.today;
  if (n === 1) return r.tomorrow;
  if (n === -1) return r.yesterday;
  if (n === 2) return r.in2;
  if (n === -2) return r.ago2;
  return n > 0 ? r.inN(n) : r.agoN(-n);
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

export function monthTitle(d: string, lang: Lang = "he"): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(toUtc(d)),
  );
}

// Narrow weekday names, Sunday first: א׳ ב׳ ג׳ ...
export function weekdayNames(lang: Lang = "he"): string[] {
  const fmt = new Intl.DateTimeFormat(LOCALE[lang], { weekday: "narrow", timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 7 + i))));
}

export function dayLabel(d: string, lang: Lang = "he"): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
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
