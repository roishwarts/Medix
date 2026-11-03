import { getT } from "@/lib/i18n/server";
import { requireProfile } from "@/lib/auth";
import { loadQuestions } from "@/lib/doctor-questions";
import { QuestionCard } from "./question-card";

export const dynamic = "force-dynamic";

const ANSWERED_DAYS = 30;

// The doctor's queue: open questions from the team (urgent first, then oldest first), and the recent answers.
// A secretary sees the same list, with her own questions answerable only by the doctor.
export default async function QuestionsPage() {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const isDoctor = profile.role === "doctor";
  const since = new Date(Date.now() - ANSWERED_DAYS * 86_400_000).toISOString();
  const all = await loadQuestions({ answeredSince: since });

  const open = all
    .filter((q) => !q.answeredAt)
    .sort((a, b) => (a.urgent === b.urgent ? (a.askedAt < b.askedAt ? -1 : 1) : a.urgent ? -1 : 1));
  const answered = all.filter((q) => q.answeredAt).sort((a, b) => (a.answeredAt! < b.answeredAt! ? 1 : -1));

  return (
    <main className="space-y-8">
      <header>
        <h1 className="display text-3xl sm:text-4xl">{t("שאלות לרופא")}</h1>
        <p className="mt-1 text-muted">
          {isDoctor ? t("שאלות שהצוות שלח אליך. תשובה נשמרת על כרטיס המטופל ונראית לכל הצוות.") : t("שאלות שנשלחו לרופא והתשובות שלו. אפשר לשלוח שאלה חדשה מכרטיס המטופל.")}
        </p>
      </header>

      <section aria-label={t("ממתינות לתשובה")}>
        <h2 className="mb-3 flex items-baseline gap-2 text-lg font-medium">
          {t("ממתינות לתשובה")} <span className="num text-sm text-muted">{open.length}</span>
        </h2>
        <div className="card divide-y divide-line">
          {open.length === 0 && <p className="px-4 py-10 text-center text-muted">{t("אין שאלות פתוחות.")}</p>}
          {open.map((q) => (
            <QuestionCard key={q.id} q={q} canAnswer={isDoctor} canWithdraw={isDoctor || q.askedById === profile.id} />
          ))}
        </div>
      </section>

      {answered.length > 0 && (
        <section aria-label={t("נענו לאחרונה")}>
          <h2 className="mb-3 text-lg font-medium">{t("נענו ב-{n} הימים האחרונים", { n: ANSWERED_DAYS })}</h2>
          <div className="card divide-y divide-line">
            {answered.map((q) => <QuestionCard key={q.id} q={q} canAnswer={false} canWithdraw={false} />)}
          </div>
        </section>
      )}
    </main>
  );
}
