import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Profile = {
  id: string;
  clinic_id: string;
  role: "patient" | "caregiver" | "staff" | "doctor";
  full_name: string;
  clinic_name: string;
};

export const LOGIN_DOMAIN = process.env.NEXT_PUBLIC_LOGIN_DOMAIN ?? "medix.local";

// The signed-in user's id, read from the verified session token. This avoids a round trip to the
// auth server on every request when the project signs tokens with asymmetric keys.
export const getAuthUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getAuthUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, clinic_id, role, full_name, disabled, clinics(name)")
    .eq("id", userId)
    .maybeSingle();
  if (!data || data.disabled) return null;
  const clinic = (Array.isArray(data.clinics) ? data.clinics[0] : data.clinics) as { name: string } | null;
  return {
    id: data.id,
    clinic_id: data.clinic_id,
    role: data.role,
    full_name: data.full_name,
    clinic_name: clinic?.name ?? "",
  };
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
  const userId = await getAuthUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("patient_caregivers")
    .select("id, patient_id, relation, can_act, patients(full_name)")
    .eq("user_id", userId)
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

// The clinic's display name, shown as the title of every signed-in screen.
export const getClinicName = cache(async (): Promise<string> => (await getProfile())?.clinic_name ?? "");
