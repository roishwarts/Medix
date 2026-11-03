"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PatientHit = { id: string; name: string; phone: string | null };

// Finds patients of the signed-in clinic by name, phone or ID number (the database only returns this clinic's patients).
export async function searchPatients(query: string): Promise<PatientHit[]> {
  await requireProfile(["staff", "doctor"]);
  // Characters with a meaning inside the filter syntax are dropped rather than escaped.
  const q = query.replace(/[%*,()\\]/g, " ").trim().slice(0, 60);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const like = `%${q}%`;
  let res = await supabase.from("patients").select("id, full_name, phone").or(`full_name.ilike.${like},phone.ilike.${like},national_id.ilike.${like}`).order("full_name").limit(8);
  // Before patch-medical-info.sql there is no ID column: search name and phone only.
  if (res.error) res = await supabase.from("patients").select("id, full_name, phone").or(`full_name.ilike.${like},phone.ilike.${like}`).order("full_name").limit(8);
  return (res.data ?? []).map((p) => ({ id: p.id as string, name: p.full_name as string, phone: (p.phone as string | null) ?? null }));
}
