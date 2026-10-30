import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Profile = {
  id: string;
  clinic_id: string;
  role: "patient" | "caregiver" | "staff" | "doctor";
  full_name: string;
  clinic_name: string;
  mfa_required: boolean;
  clinic_address: string | null;
};

export const LOGIN_DOMAIN = process.env.NEXT_PUBLIC_LOGIN_DOMAIN ?? "medix.local";

// The verified session claims, read once per request. With asymmetric signing keys this needs no network call.
const getClaimsOnce = cache(async () => {
  // proxy.ts already verified the session and passes the result along (it strips anything the browser sends).
  const h = await headers();
  const uid = h.get("x-medix-uid");
  if (uid) return { sub: uid, aal: h.get("x-medix-aal") ?? "aal1" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims ?? null) as { sub?: string; aal?: string } | null;
});

// The signed-in user's id, read from the verified session token.
export const getAuthUserId = cache(async (): Promise<string | null> => (await getClaimsOnce())?.sub ?? null);

// Authenticator assurance level of this session: "aal2" once the second factor has been verified.
export const getAal = cache(async (): Promise<string> => String((await getClaimsOnce())?.aal ?? "aal1"));

export const getProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getAuthUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, clinic_id, role, full_name, disabled, clinics(*)")
    .eq("id", userId)
    .maybeSingle();
  if (!data || data.disabled) return null;
  const clinic = (Array.isArray(data.clinics) ? data.clinics[0] : data.clinics) as { name: string; mfa_required?: boolean; address?: string | null } | null;
  return {
    id: data.id,
    clinic_id: data.clinic_id,
    role: data.role,
    full_name: data.full_name,
    clinic_name: clinic?.name ?? "",
    mfa_required: !!clinic?.mfa_required,
    clinic_address: clinic?.address ?? null,
  };
});

// Staff and doctors of a clinic that turned on two-factor login must verify it each session.
export const needsSecondFactor = (p: Profile) => p.mfa_required && (p.role === "staff" || p.role === "doctor");

export async function requireProfile(roles?: Profile["role"][]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login?error=profile");
  if (roles && !roles.includes(profile.role)) redirect("/");
  if (needsSecondFactor(profile) && (await getAal()) !== "aal2") redirect("/mfa");
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
