import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAal, getProfile, needsSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { Icon } from "@/components/ui";
import { MfaForm } from "./form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  return { title: profile?.clinic_name || "כניסה" };
}

export default async function MfaPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?error=profile");
  if (!needsSecondFactor(profile) || (await getAal()) === "aal2") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp?.[0] ?? null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <div className="card p-5 sm:p-8">
        <div className="mb-4 flex items-center gap-2 text-muted">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="lock" size={16} />
          </span>
          {profile.clinic_name && <span className="eyebrow">{profile.clinic_name}</span>}
        </div>
        <h1 className="display text-3xl">אימות דו-שלבי</h1>
        <p className="mb-6 mt-1.5 text-muted">
          {factor
            ? "הזינו את הקוד בן 6 הספרות מאפליקציית האימות בטלפון."
            : "המרפאה דורשת אימות דו-שלבי. מחברים פעם אחת אפליקציית אימות, ובכל כניסה מזינים קוד קצר."}
        </p>
        <MfaForm factorId={factor?.id ?? null} />
      </div>
      <div className="mt-3 flex justify-center [&_.btn]:min-h-11 [&_.btn]:px-5">
        <LogoutButton />
      </div>
    </main>
  );
}
