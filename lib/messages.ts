import { makeT } from "./i18n";
import type { Lang } from "./prefs";

// The link opens the page in the patient's language, even on a phone that has never chosen one.
const withLang = (link: string, lang: Lang) => (lang === "he" ? link : `${link}?lang=${lang}`);
const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;

// The messages staff send by WhatsApp or email, written in the language the patient uses in the app.
export const joinMessage = (patientName: string, clinicName: string, link: string, lang: Lang = "he") =>
  makeT(lang)("שלום {name}, הוזמנת להצטרף אל {clinic}. יוצרים משתמש בקישור האישי (תקף 14 ימים): {link}", { name: first(patientName), clinic: clinicName, link: withLang(link, lang) });

export const caregiverMessage = (inviteeName: string, patientName: string, clinicName: string, link: string, lang: Lang = "he") =>
  makeT(lang)("שלום {name}, הוזמנת לעקוב אחרי ההכנה לניתוח של {patient} ב{clinic}. מצטרפים בקישור האישי (תקף 7 ימים): {link}", { name: first(inviteeName), patient: first(patientName), clinic: clinicName, link: withLang(link, lang) });

export const resetMessage = (name: string, link: string, lang: Lang = "he") =>
  makeT(lang)("שלום {name}, קישור לאיפוס הסיסמה (תקף 48 שעות): {link}", { name: first(name), link: withLang(link, lang) });
