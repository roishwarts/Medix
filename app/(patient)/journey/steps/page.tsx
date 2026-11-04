import { requireProfile } from "@/lib/auth";
import { loadJourneys } from "@/lib/queries";
import { pickActiveJourney } from "@/lib/journey";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { JourneyTimeline } from "../timeline";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT())("המסע שלך") };
}

// The journey on its own screen, for a phone: every step in order, with a way back to the home page.
export default async function JourneyStepsPage({ searchParams }: { searchParams: Promise<{ j?: string }> }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [, journeys, sp] = await Promise.all([requireProfile(["patient", "caregiver"]), loadJourneys(), searchParams]);
  if (journeys.length === 0) {
    return <p className="py-20 text-center text-muted">{t("עדיין לא הוגדר עבורך מסלול. פנה/י למרפאה.")}</p>;
  }
  const journey = (sp.j && journeys.find((j) => j.id === sp.j)) || pickActiveJourney(journeys)!;
  return (
    <main>
      <JourneyTimeline journey={journey} t={t} lang={lang} className="min-w-0" />
    </main>
  );
}
