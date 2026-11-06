import { requireProfile } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { loadJourneys } from "@/lib/queries";
import { resolvePlace } from "@/lib/location";

export const dynamic = "force-dynamic";

// RFC 5545 §3.3.11: escape backslash, semicolon, comma, then turn real newlines into the literal "\n".
function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function dateStamp(iso: string): string {
  return iso.replace(/-/g, "");
}

// Local Asia/Jerusalem date+time with no UTC conversion (floating time) — simplest correct choice
// for a clinic appointment, since the server has no reliable DST table without a library.
function dateTimeStamp(dateIso: string, time: string): string {
  return `${dateStamp(dateIso)}T${time.replace(":", "")}00`;
}

// One hour after the start, so the event shows as a block in the calendar.
function endStamp(dateIso: string, time: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const end = new Date(Date.UTC(y, m - 1, d, hh + 1, mm));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${end.getUTCFullYear()}${p(end.getUTCMonth() + 1)}${p(end.getUTCDate())}T${p(end.getUTCHours())}${p(end.getUTCMinutes())}00`;
}

function foldLine(line: string): string {
  // RFC 5545 §3.1: lines over 75 octets are folded with CRLF + a leading space (never inside a character).
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const max = parts.length === 0 ? 75 : 74;
    if (size + n > max) { parts.push(cur); cur = ""; size = 0; }
    cur += ch; size += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

export async function GET(req: Request) {
  // ?e=<id> exports just that event (the surgery day "s-<journey id>", or one task), so each item can have its own add button.
  const only = new URL(req.url).searchParams.get("e");
  const t = await getT();
  const profile = await requireProfile(["patient", "caregiver"]);
  const journeys = await loadJourneys();
  if (journeys.length === 0) return new Response("Not found", { status: 404 });

  const now = dateStamp(new Date().toISOString().slice(0, 10)) + "T000000Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Patient Calendar//HE",
    "CALSCALE:GREGORIAN",
  ];

  // More than one journey (another surgery, past or planned) all go on the same exported calendar.
  for (const journey of journeys) {
    // Surgery day: all-day event.
    if (!only || only === `s-${journey.id}`) lines.push(
      "BEGIN:VEVENT",
      `UID:surgery-${journey.id}@calendar`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateStamp(journey.surgery_date)}`,
      `SUMMARY:${esc(journey.procedure ? t("יום הניתוח – {procedure}", { procedure: journey.procedure }) : t("יום הניתוח"))}`,
      "END:VEVENT",
    );

    // Every appointment-kind task (pre- or post-op): a doctor visit, a test with a set time, etc.
    for (const task of journey.summary.tasks) {
      const target = only === task.id;
      if (task.kind !== "appointment" && !target) continue;
      if (only && !target) continue;
      if (task.kind !== "appointment") {
        // A task deadline (only exported on request): an all-day event on its due date.
        lines.push("BEGIN:VEVENT", `UID:task-${task.id}@calendar`, `DTSTAMP:${now}`, `DTSTART;VALUE=DATE:${dateStamp(task.dueDate)}`, `SUMMARY:${esc(task.title)}`);
        if (task.description) lines.push(`DESCRIPTION:${esc(task.description)}`);
        lines.push("END:VEVENT");
        continue;
      }
      const place = resolvePlace(task.location, profile.clinic_address);
      lines.push("BEGIN:VEVENT", `UID:task-${task.id}@calendar`, `DTSTAMP:${now}`);
      // Floating local time (no time zone): the same clock time on any phone, with no time-zone definition needed.
      if (task.eventTime) {
        lines.push(`DTSTART:${dateTimeStamp(task.eventDate, task.eventTime)}`, `DTEND:${endStamp(task.eventDate, task.eventTime)}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${dateStamp(task.eventDate)}`);
      }
      lines.push(`SUMMARY:${esc(task.title)}`);
      if (task.description) lines.push(`DESCRIPTION:${esc(task.description)}`);
      if (place.address) lines.push(`LOCATION:${esc(place.address)}`);
      else if (place.place) lines.push(`LOCATION:${esc(place.place)}`);
      lines.push("END:VEVENT");
    }
  }

  // An id that matches nothing is an error, not an empty calendar.
  if (only && !lines.includes("BEGIN:VEVENT")) return new Response("Not found", { status: 404 });

  lines.push("END:VCALENDAR");
  const body = lines.map(foldLine).join("\r\n") + "\r\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // inline: on iPhone and Mac the calendar opens straight away with the events, instead of saving a file.
      "Content-Disposition": 'inline; filename="calendar.ics"',
      "Cache-Control": "no-store",
    },
  });
}
