import { getT } from "@/lib/i18n/server";

// Required before any patient's personal/medical data is collected: the privacy policy a patient
// consents to during onboarding (app/onboarding/onboarding-flow.tsx) links here. Public (see
// proxy.ts's isPublic check) since a policy that only logged-in users can read defeats its purpose —
// a prospective patient should be able to review it before ever signing in.
export async function generateMetadata() {
  return { title: (await getT())("מדיניות הפרטיות") };
}

export default async function PrivacyPage() {
  const t = await getT();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="display mt-6 text-3xl">{t("מדיניות הפרטיות")}</h1>
      <p className="mt-1 text-sm text-muted">{t("עדכון אחרון: נובמבר 2026")}</p>

      <div className="mt-6 space-y-6 text-sm leading-7">
        <section>
          <h2 className="text-lg font-medium">{t("מי אנחנו ועל מה חלה המדיניות")}</h2>
          <p className="mt-2">
            {t(
              'אפליקציה זו ("האפליקציה") מופעלת ע״י [להשלים: שם החברה המפעילה] ("אנחנו"), המספקת למרפאות מערכת לניהול מסלול ההכנה והטיפול של מטופליהן. המרפאה שבה אתם מטופלים היא בעלת המידע שלכם ("בעלת המאגר"); אנחנו מעבדים אותו מטעמה, כפי שמוסכם בינינו בהסכם כתוב, ובהתאם למדיניות זו.',
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("איזה מידע נאסף")}</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>{t("פרטים מזהים: שם מלא, טלפון, דוא״ל, ובמידת הצורך תעודת זהות ופרטי ביטוח/חברה.")}</li>
            <li>
              {t(
                "מידע רפואי הקשור להליך: אבחנה, אלרגיות, תרופות, היסטוריה רפואית, מסמכים ותוצאות שאתם או הצוות המטפל מעלים (הפניות, בדיקות), ותשובותיכם לשאלוני מעקב (PROMS) אם נעשה בהם שימוש.",
              )}
            </li>
            <li>{t("מידע על השימוש באפליקציה: אילו משימות הושלמו ומתי, הודעות בין הצוות לביניכם, היסטוריית כניסות.")}</li>
            <li>{t("אם הוזמן בן משפחה לצפות במסלול שלכם — שמו ופרטי הקשר שלו, והיקף ההרשאות שהענקתם לו.")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("למה המידע משמש")}</h2>
          <p className="mt-2">
            {t(
              "ניהול ותזכור שלבי ההכנה לטיפול, תקשורת בינך לבין הצוות המטפל, שיתוף בן משפחה שהוגדר ככזה לפי בקשתך, ותחזוקה ושיפור השירות. המידע הרפואי אינו משמש לכל מטרה אחרת (כגון שיווק) ואינו מועבר לצד שלישי מעבר למפורט במדיניות זו.",
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("מי רואה את המידע")}</h2>
          <p className="mt-2">
            {t(
              "הצוות המטפל במרפאה שלכם (רופא/ה ומזכירות המרפאה), בני משפחה שהזמנתם במפורש לצפות במסלול (ובהתאם להרשאות שקבעתם להם — צפייה בלבד, או גם פעולה בשמכם), ואנחנו — כמי שמפעיל את התשתית הטכנית, בהיקף הדרוש לתחזוקה ולתמיכה בלבד.",
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("ספקי משנה ואחסון המידע")}</h2>
          <p className="mt-2">
            {t(
              "האפליקציה פועלת על גבי ספקי תשתית חיצוניים (בסיס נתונים ואחסון קבצים, ואחסון קוד האפליקציה), הכפופים להסכמי עיבוד מידע מולנו. [להשלים: מיקום גיאוגרפי של השרתים/אזור האחסון].",
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("אבטחת מידע")}</h2>
          <p className="mt-2">
            {t(
              "המידע מאובטח בהצפנה בתעבורה ובמנוחה, גישה למידע מוגבלת ומתועדת לפי תפקיד (מטופל, בן משפחה, צוות מרפאה), וכל גישה למסמכים רפואיים נבדקת מול המשתמש הרלוונטי בלבד.",
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("תקופת השמירה")}</h2>
          <p className="mt-2">
            {t("[להשלים: תקופת שמירת המידע הרפואי/האישי, ומה קורה למידע כשהטיפול מסתיים או כשמטופל מבקש להימחק]")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("הזכויות שלכם")}</h2>
          <p className="mt-2">
            {t(
              "בהתאם לחוק הגנת הפרטיות, תשמ״א-1981, יש לכם זכות לעיין במידע שנשמר עליכם, לבקש את תיקונו אם הוא שגוי, ולבקש את מחיקתו (בכפוף לחובות שמירה חוקיות שעשויות לחול על מרפאה). לממש זכות זו, ניתן לפנות למרפאה שלכם או אלינו בפרטים שלהלן.",
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("עדכונים למדיניות")}</h2>
          <p className="mt-2">{t("אם נעדכן את המדיניות באופן מהותי, נבקש מכם להסכים למדיניות המעודכנת בכניסתכם הבאה לאפליקציה.")}</p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("יצירת קשר")}</h2>
          <p className="mt-2">
            {t("שאלות או בקשות בנושא פרטיות המידע שלכם ניתן להפנות אל:")}
            <br />
            {t("[להשלים: שם איש קשר/ממונה אבטחת מידע]")}
            <br />
            {t("דוא״ל: ")}
            {t("[להשלים: כתובת אימייל]")}
          </p>
        </section>
      </div>
    </main>
  );
}
