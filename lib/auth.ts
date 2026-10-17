import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Profile = {
  id: string;
  clinic_id: string;
  role: "patient" | "caregiver" | "staff" | "doctor";
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

export type CaregiverLink = {
  id: string;
  patient_id: string;
  patient_name: string;
  relation: string;
  can_act: boolean;
};

// For a signed-in caregiver: which patient they follow and whether they may act for them.
export const getCaregiverLink = cache(async (): Promise<CaregiverLink | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("patient_caregivers")
    .select("id, patient_id, relation, can_act, patients(full_name)")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!data) return null;
  const patient = (Array.isArray(data.patients) ? data.patients[0] : data.patients) as { full_name: string } | null;
  return {
    id: data.id,
    patient_id: data.patient_id,
    patient_name: patient?.full_name ?? "",
    relation: data.relation,
    can_act: data.can_act,
  };
});
