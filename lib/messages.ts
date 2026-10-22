const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const joinMessage = (patientName: string, clinicName: string, link: string) =>
  `שלום ${first(patientName)}, הוזמנת להצטרף אל ${clinicName}. יוצרים משתמש בקישור האישי (תקף 14 ימים): ${link}`;

export const caregiverMessage = (inviteeName: string, patientName: string, clinicName: string, link: string) =>
  `שלום ${first(inviteeName)}, הוזמנת לעקוב אחרי ההכנה לניתוח של ${first(patientName)} ב${clinicName}. מצטרפים בקישור האישי (תקף 7 ימים): ${link}`;

export const resetMessage = (name: string, link: string) =>
  `שלום ${first(name)}, קישור לאיפוס הסיסמה (תקף 48 שעות): ${link}`;
