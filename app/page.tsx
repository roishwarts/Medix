import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { getPlatformAdmin } from "@/lib/admin";

export default async function Home() {
  const profile = await getProfile();
  if (!profile) {
    if (await getPlatformAdmin()) redirect("/admin");
    redirect("/login?error=profile");
  }
  if (profile.role === "patient" && !profile.onboarded_at) redirect("/onboarding");
  redirect(profile.role === "patient" || profile.role === "caregiver" ? "/journey" : "/clinic");
}
