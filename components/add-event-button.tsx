"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { googleCalendarUrl, type CalendarEvent } from "@/lib/calendar-links";

// An icon that adds ONE event to the person's calendar: on iPhone and Mac the calendar opens straight from the
// .ics link; other phones open Google Calendar with the event already filled in.
export function AddEventButton({ id, event, googleOnly }: { id: string; event: CalendarEvent; googleOnly?: boolean }) {
  const t = useT();
  const [apple, setApple] = useState<boolean | null>(null);
  useEffect(() => { setApple(/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)); }, []);
  const label = t("הוספה ליומן: {title}", { title: event.title });
  return (
    <a
      href={apple === false || googleOnly ? googleCalendarUrl(event) : `/api/calendar/ics?e=${encodeURIComponent(id)}`}
      target={apple === false || googleOnly ? "_blank" : undefined}
      rel={apple === false || googleOnly ? "noopener noreferrer" : undefined}
      aria-label={label}
      title={t("הוספה ליומן")}
      className="btn btn-icon size-11 min-h-11 shrink-0"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M4 10h16M9 3.5v4M15 3.5v4M12 13v4M10 15h4" />
      </svg>
    </a>
  );
}
