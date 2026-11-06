import { getT } from "@/lib/i18n/server";
import { requireProfile } from "@/lib/auth";
import { loadTeam } from "./actions";
import { TeamForm } from "./team-form";
import { TeamMemberRow } from "./team-member-row";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [t, profile, team] = await Promise.all([getT(), requireProfile(["doctor"]), loadTeam()]);

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
        <>
          <ul className="card mt-6 divide-y divide-line" aria-label={t("אנשי צוות")}>
            {team.map((m) => (
              <TeamMemberRow key={m.id} id={m.id} name={m.full_name} nameEn={m.full_name_en} username={m.username} role={m.role} disabled={m.disabled} mfa={m.mfa} isSelf={m.id === profile.id} />
            ))}
          </ul>
          {team.length === 1 && team[0].id === profile.id && (
            <p className="mt-3 text-sm text-muted">{t("עדיין לא הוספת אנשי צוות נוספים.")}</p>
          )}
        </>
      )}

      <h2 className="mt-8 mb-2 text-lg font-medium">{t("הוספת איש צוות")}</h2>
      <TeamForm />
    </main>
  );
}
