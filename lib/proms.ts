// PROMs (Patient-Reported Outcome Measures) question sets.
//
// IMPORTANT — this wording is an in-house Hebrew restructuring, matching the public shape of these
// instruments (same dimensions/items, same response scale, same recall period) — it is NOT the
// officially licensed translation. EQ-5D-5L's approved wording is licensed by EuroQol; the Oxford
// Knee Score's by Oxford University Innovation. Before using these for real clinical research or
// comparing results across studies, get the licensed Hebrew wording from the rights holder and swap
// the labels below — nothing else (scoring, storage, UI) needs to change.

export type Instrument = "eq5d5l" | "oks";
export type Timepoint = "baseline" | "month3" | "year1";

export const TIMEPOINT_LABEL: Record<Timepoint, string> = {
  baseline: "לפני הניתוח",
  month3: "3 חודשים אחרי הניתוח",
  year1: "שנה אחרי הניתוח",
};

// ---------------------------------------------------------------- EQ-5D-5L (general health)

export const EQ5D_LEVELS = [
  "אין לי כל קושי",
  "יש לי קושי קל",
  "יש לי קושי בינוני",
  "יש לי קושי רב",
  "אני לא מסוגל/ת בכלל",
] as const;

export const EQ5D_DIMENSIONS: { key: "d1" | "d2" | "d3" | "d4" | "d5"; title: string }[] = [
  { key: "d1", title: "ניידות" },
  { key: "d2", title: "טיפול עצמי (רחצה, התלבשות)" },
  { key: "d3", title: "פעילויות יומיום רגילות (עבודה, לימודים, משק בית, פנאי)" },
  { key: "d4", title: "כאב / אי-נוחות" },
  { key: "d5", title: "חרדה / דיכאון" },
];

// ---------------------------------------------------------------- Oxford Knee Score (knee function)

export type OksAnswer = { value: number; label: string };

export const OKS_ITEMS: { key: `q${number}`; title: string; answers: OksAnswer[] }[] = [
  { key: "q1", title: "איך היית מתאר/ת את הכאב שחווית בדרך כלל בברך בארבעת השבועות האחרונים?",
    answers: [{ value: 4, label: "ללא כאב" }, { value: 3, label: "קל מאוד" }, { value: 2, label: "קל" }, { value: 1, label: "בינוני" }, { value: 0, label: "חזק" }] },
  { key: "q2", title: "האם היה לך קושי לרחוץ ולהתנגב (בכל הגוף) בגלל הברך?",
    answers: [{ value: 4, label: "ללא קושי" }, { value: 3, label: "קושי מועט" }, { value: 2, label: "קושי בינוני" }, { value: 1, label: "קושי רב" }, { value: 0, label: "לא מסוגל/ת בכלל" }] },
  { key: "q3", title: "האם היה לך קושי להיכנס או לצאת מרכב, או להשתמש בתחבורה ציבורית, בגלל הברך?",
    answers: [{ value: 4, label: "ללא קושי" }, { value: 3, label: "קושי מועט" }, { value: 2, label: "קושי בינוני" }, { value: 1, label: "קושי רב" }, { value: 0, label: "לא מסוגל/ת בכלל" }] },
  { key: "q4", title: "לכמה זמן הצלחת ללכת לפני שהכאב בברך הפך לחזק (עם או בלי מקל הליכה)?",
    answers: [{ value: 4, label: "ללא הגבלה / יותר מ-30 דקות" }, { value: 3, label: "16–30 דקות" }, { value: 2, label: "5–15 דקות" }, { value: 1, label: "רק בתוך הבית" }, { value: 0, label: "כלל לא, או כאב חזק מיד" }] },
  { key: "q5", title: "אחרי ארוחה (בישיבה ליד שולחן), כמה כואב לקום מכיסא בגלל הברך?",
    answers: [{ value: 4, label: "ללא כאב" }, { value: 3, label: "כאב קל" }, { value: 2, label: "כאב בינוני" }, { value: 1, label: "כאב רב" }, { value: 0, label: "כאב חזק מאוד" }] },
  { key: "q6", title: "האם הצלעת (צליעה) בגלל הברך בזמן הליכה?",
    answers: [{ value: 4, label: "לעיתים רחוקות / אף פעם" }, { value: 3, label: "לפעמים, או רק בהתחלה" }, { value: 2, label: "לעיתים קרובות, לא רק בהתחלה" }, { value: 1, label: "רוב הזמן" }, { value: 0, label: "כל הזמן" }] },
  { key: "q7", title: "האם היית יכול/ה לכרוע ברך ולקום שוב בלי קושי גדול?",
    answers: [{ value: 4, label: "ללא קושי" }, { value: 3, label: "קושי מועט" }, { value: 2, label: "קושי בינוני" }, { value: 1, label: "קושי רב" }, { value: 0, label: "לא מסוגל/ת בכלל" }] },
  { key: "q8", title: "האם הברך הפריעה לשנת הלילה שלך?",
    answers: [{ value: 4, label: "אף לילה" }, { value: 3, label: "לילה אחד או שניים" }, { value: 2, label: "חלק מהלילות" }, { value: 1, label: "רוב הלילות" }, { value: 0, label: "כל לילה" }] },
  { key: "q9", title: "עד כמה הכאב בברך הפריע לעבודה היומיומית שלך (כולל משק בית)?",
    answers: [{ value: 4, label: "ללא הפרעה" }, { value: 3, label: "מעט" }, { value: 2, label: "בינונית" }, { value: 1, label: "רבה" }, { value: 0, label: "מוחלטת" }] },
  { key: "q10", title: "האם הרגשת שהברך עלולה 'לבגוד' בך / להיכשל פתאום?",
    answers: [{ value: 4, label: "אף פעם" }, { value: 3, label: "לעיתים רחוקות" }, { value: 2, label: "לפעמים, לא רק בספורט" }, { value: 1, label: "לעיתים קרובות, לא רק בספורט" }, { value: 0, label: "כל הזמן" }] },
  { key: "q11", title: "האם היית יכול/ה לעשות קניות משק בית בעצמך?",
    answers: [{ value: 4, label: "ללא קושי" }, { value: 3, label: "קושי מועט" }, { value: 2, label: "קושי בינוני" }, { value: 1, label: "קושי רב" }, { value: 0, label: "לא מסוגל/ת בכלל" }] },
  { key: "q12", title: "האם היית יכול/ה לרדת מדרגה אחת בבת אחת בלי קושי?",
    answers: [{ value: 4, label: "ללא קושי" }, { value: 3, label: "קושי מועט" }, { value: 2, label: "קושי בינוני" }, { value: 1, label: "קושי רב" }, { value: 0, label: "לא מסוגל/ת בכלל" }] },
];

export const OKS_MAX = 48;

export function instrumentTitle(instrument: Instrument): string {
  return instrument === "oks" ? "שאלון הברך" : "שאלון בריאות כללי";
}

// A short, human read of the score for the doctor-side summary. OKS: 0-48 (higher = better).
// EQ-5D here is the VAS "health today" 0-100 (higher = better) — see the file header on the index.
export function scoreLabel(instrument: Instrument, score: number | null): string {
  if (score === null) return "—";
  return instrument === "oks" ? `${score}/${OKS_MAX}` : `${score}/100`;
}
