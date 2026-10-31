import { getT } from "@/lib/i18n/server";
import { loadTeam } from "./actions";
import { TeamForm } from "./team-form";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<"staff" | "doctor", string> = { staff: "צוות", doctor: "רופא" };

export default async function TeamPage() {
  const t = await getT();
  const team = await loadTeam();

  return (
    <main className="max-w-2xl pb-6">
      <p className="eyebrow">{t("מרפאה")}</p>
      <h1 className="display mt-1 text-4xl">{t("הצוות שלי")}</h1>
      <p className="mt-2 max-w-prose text-muted">
        {t("הוספת רופא או איש צוות חדש עם כניסה עצמאית למערכת. רק רופא יכול להוסיף משתמשים.")}
      </p>

      {team.length === 0 ? (
        <div className="card mt-6 px-4 py-12 text-center">
          <p className="font-medium">{t("עדיין אין אנשי צוות.")}</p>
        </div>
      ) : (
        <ul className="card mt-6 divide-y divide-line" aria-label={t("אנשי צוות")}>
          {team.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0 break-words font-medium">{m.full_name}</span>
              <span className="pill pill-neutral shrink-0">{t(ROLE_LABEL[m.role])}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 mb-2 text-lg font-medium">{t("הוספת איש צוות")}</h2>
      <TeamForm />
    </main>
  );
}
