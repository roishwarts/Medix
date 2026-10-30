"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function saveTemplatePatientInfo(templateId: string, patientInfo: string): Promise<{ error?: string }> {
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_template_patient_info", { p_template: templateId, p_patient_info: patientInfo });
  if (error) return { error: "השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-patient-content.sql." };
  revalidatePath("/clinic/content");
  return {};
}

export async function addClinicLink(label: string, url: string): Promise<{ error?: string }> {
  const profile = await requireProfile(["staff", "doctor"]);
  const l = label.trim();
  let u = url.trim();
  if (!l) return { error: "יש להזין שם לקישור" };
  if (!u) return { error: "יש להזין כתובת" };
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    new URL(u);
  } catch {
    return { error: "הכתובת אינה תקינה" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("clinic_links").insert({ clinic_id: profile.clinic_id, label: l, url: u });
  if (error) return { error: "ההוספה נכשלה. ודאו שהורצה התוספת supabase/patch-patient-content.sql." };
  revalidatePath("/clinic/content");
  revalidatePath("/journey");
  return {};
}

export async function removeClinicLink(id: string): Promise<{ error?: string }> {
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  await supabase.from("clinic_links").delete().eq("id", id);
  revalidatePath("/clinic/content");
  revalidatePath("/journey");
  return {};
}

export async function addClinicVideo(title: string, phase: "before" | "after", storagePath: string): Promise<{ error?: string }> {
  const profile = await requireProfile(["staff", "doctor"]);
  const t = title.trim();
  if (!t) return { error: "יש להזין שם לסרטון" };
  const supabase = await createClient();
  const { error } = await supabase.from("clinic_videos").insert({ clinic_id: profile.clinic_id, title: t, phase, storage_path: storagePath });
  if (error) {
    await supabase.storage.from("clinic-videos").remove([storagePath]);
    return { error: "השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-patient-content.sql." };
  }
  revalidatePath("/clinic/content");
  revalidatePath("/journey");
  return {};
}

export async function removeClinicVideo(id: string): Promise<{ error?: string }> {
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { data } = await supabase.from("clinic_videos").select("storage_path").eq("id", id).maybeSingle();
  await supabase.from("clinic_videos").delete().eq("id", id);
  if (data?.storage_path) await supabase.storage.from("clinic-videos").remove([data.storage_path]);
  revalidatePath("/clinic/content");
  revalidatePath("/journey");
  return {};
}
