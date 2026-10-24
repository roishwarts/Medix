import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { clinicEvents } from "@/lib/calendar";
import { Calendar, parseCalParams } from "@/components/calendar";

export const dynamic = "force-dynamic";

export default async function ClinicCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; d?: string; notReady?: string }>;
}) {
  const sp = await searchParams;
  const { view, d } = parseCalParams(sp);
  const notReady = sp.notReady === "1";
  const all = await loadJourneys();
  const journeys = notReady ? all.filter((j) => j.summary.readiness < 100) : all;

  const toggle = new URLSearchParams({ view, d });
  if (!notReady) toggle.set("notReady", "1");

  return (
    <main>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl">יומן</h1>
        </div>
        <Link href={`/clinic/calendar?${toggle.toString()}`} aria-pressed={notReady}
          className={`btn btn-sm ${notReady ? "btn-primary" : ""}`}>
          לא מוכנים בלבד
        </Link>
      </div>
      <Calendar events={clinicEvents(journeys)} view={view} d={d} basePath="/clinic/calendar"
        query={{ notReady: notReady ? "1" : undefined }} showPatient />
    </main>
  );
}
