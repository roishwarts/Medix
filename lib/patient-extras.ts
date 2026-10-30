import { createClient } from "./supabase/server";
import { STAGES, type Stage } from "./journey";
import type { Lang } from "./prefs";

export type PatientExtras = { lang: Lang; stage: Stage | null };
const LANGS_OK: Lang[] = ["he", "en", "ru", "ar"];
const toLang = (v: unknown): Lang => (LANGS_OK.includes(v as Lang) ? (v as Lang) : "he");
const toStage = (v: unknown): Stage | null => (STAGES.includes(v as Stage) ? (v as Stage) : null);

// Language and manual status of every patient the caller can see. Read on its own so that everything
// else keeps working before supabase/patch-lang-stage.sql has been run.
export async function loadPatientExtras(): Promise<Map<string, PatientExtras>> {
  const supabase = await createClient();
  const { data } = await supabase.from("patients").select("id, lang, stage_override");
  return new Map((data ?? []).map((p) => [p.id as string, { lang: toLang(p.lang), stage: toStage(p.stage_override) }]));
}

export async function patientLang(patientId: string): Promise<Lang> {
  const supabase = await createClient();
  const { data } = await supabase.from("patients").select("lang").eq("id", patientId).maybeSingle();
  return toLang(data?.lang);
}
