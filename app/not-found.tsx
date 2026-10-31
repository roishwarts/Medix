import Link from "next/link";
import { getT } from "@/lib/i18n/server";

// Next.js renders this for any unmatched route. No i18n/profile context is guaranteed to be
// available here, so this stays static and simple — matching the login page's centered-card look.
export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
      <div className="card p-6 sm:p-8">
        <p className="num display text-5xl text-muted">404</p>
        <h1 className="display mt-2 text-2xl">{t("הדף לא נמצא")}</h1>
        <p className="mt-2 text-muted">{t("ייתכן שהקישור שגוי או שהדף הוסר.")}</p>
        <Link href="/" className="btn btn-primary mt-6 w-full sm:w-auto">{t("חזרה לדף הראשי")}</Link>
      </div>
    </main>
  );
}
