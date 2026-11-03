"use server";

import { revalidatePath } from "next/cache";
import { getT } from "@/lib/i18n/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MISSING = "supabase/patch-doctor-queue.sql";

// Any staff member (secretary or doctor) can send a patient to the doctor with a question.
export async function askDoctor(input: { patientId: string; journeyId: string | null; question: string; urgent: boolean }) {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  if (!input.question.trim()) return { error: t("יש לכתוב את השאלה") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("ask_doctor", {
    p_patient: input.patientId, p_journey: input.journeyId, p_question: input.question, p_urgent: input.urgent,
  });
  if (error) return { error: t("שליחת השאלה נכשלה. ודאו שהורצה התוספת {file}.", { file: MISSING }) };
  revalidatePath("/clinic", "layout");
  return {};
}

export async function answerQuestion(id: string, answer: string) {
  const t = await getT();
  await requireProfile(["doctor"]);
  if (!answer.trim()) return { error: t("יש לכתוב תשובה") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_doctor_question", { p_id: id, p_answer: answer });
  if (error) return { error: t("שמירת התשובה נכשלה") };
  revalidatePath("/clinic", "layout");
  return {};
}

export async function withdrawQuestion(id: string) {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_doctor_question", { p_id: id });
  if (error) return { error: t("הביטול נכשל") };
  revalidatePath("/clinic", "layout");
  return {};
}
