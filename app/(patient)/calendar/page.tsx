import { loadJourneys } from "@/lib/queries";
import { patientEvents } from "@/lib/calendar";
import { Calendar, parseCalParams } from "@/components/calendar";

export const dynamic = "force-dynamic";

export default async function PatientCalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; d?: string }> }) {
  const { view, d } = parseCalParams(await searchParams);
  const [journey] = await loadJourneys();
  if (!journey) return <p className="py-20 text-center text-muted">עדיין לא הוגדר עבורך מסלול. פנה/י למרפאה.</p>;
  return (
    <main>
      <h1 className="display mb-5 text-3xl">היומן שלך</h1>
      <Calendar events={patientEvents(journey)} view={view} d={d} basePath="/calendar" />
    </main>
  );
}
