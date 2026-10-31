"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { googleCalendarUrl, type CalendarEvent } from "@/lib/calendar-links";

// iPhone and Mac open the calendar straight from the .ics link. Other phones get a choice: Google Calendar
// with the next event filled in, or the file with all the events.
export function AddToCalendar({ next }: { next: CalendarEvent | null }) {
  const t = useT();
  const [apple, setApple] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { setApple(/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)); }, []);

  if (apple !== false || !next) {
    return <a href="/api/calendar/ics" className="btn btn-sm">{t("הוספה ליומן")}</a>;
  }
  return (
    <div className="relative">
      <button type="button" className="btn btn-sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{t("הוספה ליומן")}</button>
      {open && (
        <div className="card absolute start-0 top-full z-20 mt-2 w-64 space-y-1 bg-[var(--color-surface)] p-2 shadow-xl">
          <a href={googleCalendarUrl(next)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-xl px-3 hover:bg-[var(--hover-tint)]" onClick={() => setOpen(false)}>
            {t("Google Calendar: האירוע הקרוב")}
          </a>
          <a href="/api/calendar/ics" className="flex min-h-11 items-center rounded-xl px-3 hover:bg-[var(--hover-tint)]" onClick={() => setOpen(false)}>
            {t("כל האירועים (קובץ יומן)")}
          </a>
        </div>
      )}
    </div>
  );
}
