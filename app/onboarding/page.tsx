import { requireProfile } from "@/lib/auth";
import { OnboardingFlow } from "./onboarding-flow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await requireProfile(["patient"]);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      {/* A patient who already completed onboarding before privacy consent existed (or whose
          consent is missing for any other reason) must still agree before using the app again —
          but doesn't need to sit through the "how this works" tutorial a second time. */}
      <OnboardingFlow skipIntro={!!profile.onboarded_at} needsConsent={!profile.privacy_consent_at} />
    </main>
  );
}
