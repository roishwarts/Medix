import { getT } from "@/lib/i18n/server";

// Required by Israel's Equal Rights for Persons with Disabilities (Accessibility to Services)
// Regulations 5773-2013 and Standard 5568 (WCAG 2.0): every service provider's digital properties
// must carry a published accessibility statement. Reachable from AccessControls
// (components/access-menu.tsx) everywhere in the app, logged in or on a public page.
export async function generateMetadata() {
  return { title: (await getT())("הצהרת נגישות") };
}

export default async function AccessibilityPage() {
  const t = await getT();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="display mt-6 text-3xl">{t("הצהרת נגישות")}</h1>
      <p className="mt-1 text-sm text-muted">{t("עדכון אחרון: נובמבר 2026")}</p>

      <div className="mt-6 space-y-6 text-sm leading-7">
        <section>
          <h2 className="text-lg font-medium">{t("מחויבותנו לנגישות")}</h2>
          <p className="mt-2">
            {t(
              "[להשלים: שם החברה המפעילה] מחויבת להנגיש את השירותים הדיגיטליים שלה לאנשים עם מוגבלות, בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), תשע״ג-2013, ולתקן הישראלי ת״י 5568 המבוסס על הנחיות WCAG 2.0 בסטנדרט AA.",
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("אמצעי הנגישות שמומשו באפליקציה")}</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>{t("תמיכה מלאה בניווט מקלדת ובקוראי מסך, כולל תוויות (labels), תפקידי ARIA והכרזות סטטוס עבור פעולות אסינכרוניות.")}</li>
            <li>{t("תאימות לכיוון כתיבה מימין לשמאל (RTL) בעברית ובערבית, ומשמאל לימין (LTR) באנגלית וברוסית.")}</li>
            <li>{t("תפריט נגישות בכל עמוד (סמל ה-♿ בכותרת), המאפשר שינוי גודל טקסט, מצב ניגודיות גבוהה/כהה, ובחירת שפת התצוגה.")}</li>
            <li>{t("יעדי מגע בגודל 44 פיקסלים לפחות לכל פעולה מגע במובייל.")}</li>
            <li>{t("מבנה כותרות היררכי עקבי ואזורי ניווט (landmarks) מתויגים.")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("רמת ההתאמה")}</h2>
          <p className="mt-2">
            {t("האפליקציה עומדת ברמת התאמה")} <strong>{t("AA בחלקה")}</strong>{" "}
            {t(
              "לפי ת״י 5568 ו-WCAG 2.0, על בסיס בדיקה פנימית (לא נבדקה עדיין ע״י בודק נגישות מוסמך חיצוני). אנו פועלים באופן שוטף לאיתור ותיקון בעיות נגישות נוספות.",
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("מגבלות ידועות")}</h2>
          <p className="mt-2">
            {t("[להשלים אם רלוונטי: רכיבים או עמודים שעדיין לא עברו בדיקת נגישות מלאה, למשל גרפים/דוחות מסוימים.]")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">{t("פנייה בנושא נגישות")}</h2>
          <p className="mt-2">{t("נתקלתם בבעיית נגישות? נשמח שתפנו לרכז הנגישות שלנו:")}</p>
          <p className="mt-2">
            {t("רכז נגישות: ")}
            {t("[להשלים: שם]")}
            <br />
            {t("טלפון: ")}
            {t("[להשלים: מספר טלפון]")}
            <br />
            {t("דוא״ל: ")}
            {t("[להשלים: כתובת אימייל]")}
          </p>
          <p className="mt-2">
            {t("אם לא קיבלתם מענה הולם לפנייתכם, ניתן לפנות לנציבות שוויון זכויות לאנשים עם מוגבלות במשרד המשפטים.")}
          </p>
        </section>
      </div>
    </main>
  );
}
