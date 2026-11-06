// Required by Israel's Equal Rights for Persons with Disabilities (Accessibility to Services)
// Regulations 5773-2013 and Standard 5568 (WCAG 2.0): every service provider's digital properties
// must carry a published accessibility statement. Kept in Hebrew regardless of the viewer's chosen
// UI language, as is standard practice for this kind of legal/compliance text, and reachable from
// AccessControls (components/access-menu.tsx) everywhere in the app, logged in or on a public page.
export function generateMetadata() {
  return { title: "הצהרת נגישות" };
}

export default function AccessibilityPage() {
  return (
    <main dir="rtl" lang="he" className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="display mt-6 text-3xl">הצהרת נגישות</h1>
      <p className="mt-1 text-sm text-muted">עדכון אחרון: נובמבר 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-7">
        <section>
          <h2 className="text-lg font-medium">מחויבותנו לנגישות</h2>
          <p className="mt-2">
            {"[להשלים: שם החברה המפעילה]"} מחויבת להנגיש את השירותים הדיגיטליים שלה לאנשים עם מוגבלות, בהתאם
            לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), תשע״ג-2013, ולתקן הישראלי
            ת״י 5568 המבוסס על הנחיות WCAG 2.0 בסטנדרט AA.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">אמצעי הנגישות שמומשו באפליקציה</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>תמיכה מלאה בניווט מקלדת ובקוראי מסך, כולל תוויות (labels), תפקידי ARIA והכרזות סטטוס עבור פעולות אסינכרוניות.</li>
            <li>תאימות לכיוון כתיבה מימין לשמאל (RTL) בעברית ובערבית, ומשמאל לימין (LTR) באנגלית וברוסית.</li>
            <li>תפריט נגישות בכל עמוד (סמל ה-♿ בכותרת), המאפשר שינוי גודל טקסט, מצב ניגודיות גבוהה/כהה, ובחירת שפת התצוגה.</li>
            <li>יעדי מגע בגודל 44 פיקסלים לפחות לכל פעולה מגע במובייל.</li>
            <li>מבנה כותרות היררכי עקבי ואזורי ניווט (landmarks) מתויגים.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium">רמת ההתאמה</h2>
          <p className="mt-2">
            האפליקציה עומדת ברמת התאמה <strong>AA בחלקה</strong> לפי ת״י 5568 ו-WCAG 2.0, על בסיס בדיקה פנימית
            (לא נבדקה עדיין ע״י בודק נגישות מוסמך חיצוני). אנו פועלים באופן שוטף לאיתור ותיקון בעיות נגישות
            נוספות.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">מגבלות ידועות</h2>
          <p className="mt-2">
            {"[להשלים אם רלוונטי: רכיבים או עמודים שעדיין לא עברו בדיקת נגישות מלאה, למשל גרפים/דוחות מסוימים.]"}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">פנייה בנושא נגישות</h2>
          <p className="mt-2">נתקלתם בבעיית נגישות? נשמח שתפנו לרכז הנגישות שלנו:</p>
          <p className="mt-2">
            רכז נגישות: {"[להשלים: שם]"}
            <br />
            טלפון: {"[להשלים: מספר טלפון]"}
            <br />
            דוא״ל: {"[להשלים: כתובת אימייל]"}
          </p>
          <p className="mt-2">
            אם לא קיבלתם מענה הולם לפנייתכם, ניתן לפנות לנציבות שוויון זכויות לאנשים עם מוגבלות במשרד המשפטים.
          </p>
        </section>
      </div>
    </main>
  );
}
