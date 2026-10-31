import { requireProfile } from "@/lib/auth";
import { OnboardingFlow } from "./onboarding-flow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireProfile(["patient"]);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <OnboardingFlow />
    </main>
  );
}
