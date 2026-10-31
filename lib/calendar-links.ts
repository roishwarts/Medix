// A link that opens Google Calendar with the event already filled in (for phones that do not open .ics files directly).
export type CalendarEvent = { title: string; date: string; time?: string | null; location?: string | null; details?: string | null };

const compact = (iso: string) => iso.replace(/-/g, "");

export function googleCalendarUrl(e: CalendarEvent): string {
  let dates: string;
  if (e.time) {
    const [y, m, d] = e.date.split("-").map(Number);
    const [hh, mm] = e.time.split(":").map(Number);
    const stamp = (dt: Date) => {
      const p = (n: number) => String(n).padStart(2, "0");
      return `${dt.getUTCFullYear()}${p(dt.getUTCMonth() + 1)}${p(dt.getUTCDate())}T${p(dt.getUTCHours())}${p(dt.getUTCMinutes())}00`;
    };
    dates = `${stamp(new Date(Date.UTC(y, m - 1, d, hh, mm)))}/${stamp(new Date(Date.UTC(y, m - 1, d, hh + 1, mm)))}`;
  } else {
    const [y, m, d] = e.date.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    dates = `${compact(e.date)}/${compact(next)}`;
  }
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates });
  if (e.location) p.set("location", e.location);
  if (e.details) p.set("details", e.details);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
