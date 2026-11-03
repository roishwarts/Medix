import { countOpenQuestions } from "@/lib/doctor-questions";
import { getT } from "@/lib/i18n/server";

// How many questions are waiting for the doctor's answer.
export async function QuestionsBadge() {
  const t = await getT();
  const n = await countOpenQuestions();
  if (!n) return null;
  return (
    <span className="num ms-1.5 inline-grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-medium leading-5 text-white" aria-label={t("{n} שאלות ממתינות לרופא", { n })}>
      {n > 99 ? "99+" : n}
    </span>
  );
}
