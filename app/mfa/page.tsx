import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAal, getProfile, needsSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="display text-3xl">אימות דו-שלבי</h1>
      <p className="mb-6 mt-2 text-muted">
        {factor
          ? "הזינו את הקוד בן 6 הספרות מאפליקציית האימות בטלפון."
          : "המרפאה דורשת אימות דו-שלבי. מחברים פעם אחת אפליקציית אימות, ובכל כניסה מזינים קוד קצר."}
      </p>
      <MfaForm factorId={factor?.id ?? null} />
      <div className="mt-6 flex justify-center">
        <LogoutButton />
      </div>
    </main>
  );
}
