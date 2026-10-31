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

function foldLine(line: string): string {
  // RFC 5545 §3.1: lines over 75 octets are folded with CRLF + a leading space.
  if (line.length <= 75) return line;
  let out = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length > 0) {
    out += "\r\n " + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  return out;
}

export async function GET() {
  const t = await getT();
  const profile = await requireProfile(["patient", "caregiver"]);
  const [journey] = await loadJourneys();
  if (!journey) return new Response("Not found", { status: 404 });

  const now = dateStamp(new Date().toISOString().slice(0, 10)) + "T000000Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Medix//Patient Calendar//HE",
    "CALSCALE:GREGORIAN",
  ];

  // Surgery day: all-day event.
  lines.push(
    "BEGIN:VEVENT",
    `UID:surgery-${journey.id}@medix`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dateStamp(journey.surgery_date)}`,
    `SUMMARY:${esc(journey.procedure ? t("יום הניתוח – {procedure}", { procedure: journey.procedure }) : t("יום הניתוח"))}`,
    "END:VEVENT",
  );

  // Every appointment-kind task (pre- or post-op): a doctor visit, a test with a set time, etc.
  for (const task of journey.summary.tasks) {
    if (task.kind !== "appointment") continue;
    const place = resolvePlace(task.location, profile.clinic_address);
    lines.push("BEGIN:VEVENT", `UID:task-${task.id}@medix`, `DTSTAMP:${now}`);
    if (task.eventTime) {
      lines.push(`DTSTART;TZID=Asia/Jerusalem:${dateTimeStamp(task.eventDate, task.eventTime)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${dateStamp(task.eventDate)}`);
    }
    lines.push(`SUMMARY:${esc(task.title)}`);
    if (place.address) lines.push(`LOCATION:${esc(place.address)}`);
    else if (place.place) lines.push(`LOCATION:${esc(place.place)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  const body = lines.map(foldLine).join("\r\n") + "\r\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="medix.ics"',
      "Cache-Control": "no-store",
    },
  });
}
