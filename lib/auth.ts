import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Profile = {
  id: string;
  clinic_id: string;
  role: "patient" | "staff" | "doctor";
  full_name: string;
};

export const LOGIN_DOMAIN = process.env.NEXT_PUBLIC_LOGIN_DOMAIN ?? "medix.local";

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, clinic_id, role, full_name")
    .eq("id", auth.user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

export async function requireProfile(roles?: Profile["role"][]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login?error=profile");
  if (roles && !roles.includes(profile.role)) redirect("/");
  return profile;
}
