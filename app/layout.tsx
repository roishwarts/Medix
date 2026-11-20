import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { getPlatformAdmin } from "@/lib/admin";
import { getImpersonation } from "@/lib/impersonation";
import { getPublicBrand } from "@/lib/brand-public";
import { getT } from "@/lib/i18n/server";
import { getLang, getPrefs } from "@/lib/prefs-server";
import { dictionaryFor } from "@/lib/i18n";
import { dirOf } from "@/lib/prefs";
import { I18nProvider } from "@/components/i18n-provider";
import { PrefsProvider } from "@/components/prefs-provider";
import { PublicChrome } from "@/components/public-chrome";
import { VersionBadge } from "@/components/version-badge";
import { OfflineInit } from "@/components/offline-init";
import { OfflineBanner } from "@/components/offline-banner";
import { Toaster } from "@/components/toast";

const rubik = Rubik({
  subsets: ["hebrew", "latin", "cyrillic", "arabic"],
  variable: "--font-rubik",
  weight: ["400", "500", "600"],
  display: "swap",
});


// Absolute address used for the share image in link previews (WhatsApp, etc.).
const origin =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const brand = await getPublicBrand();
  const TITLE = brand?.name ?? t("הכנה לניתוח");
  const DESCRIPTION = brand ? t("{clinic}: כל שלבי ההכנה, המסמכים והתורים שלך במקום אחד.", { clinic: brand.name }) : t("כל שלבי ההכנה, המסמכים והתורים שלך במקום אחד.");
  return {
  metadataBase: new URL(origin),
  title: brand ? `${t("כניסה")} · ${brand.name}` : t("כניסה"),
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: { type: "website", locale: "he_IL", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  appleWebApp: { capable: true, title: TITLE, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#4b6584" }, { media: "(prefers-color-scheme: dark)", color: "#131417" }] };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Only cookies are read here, so the page starts streaming at once. Who is an admin (a database lookup) is
  // checked in <AdminChrome> below, off the critical path.
  const [prefs, lang] = await Promise.all([getPrefs(), getLang()]);
  return (
    <html lang={lang} dir={dirOf(lang)} data-theme={prefs.theme} data-size={prefs.size} className={rubik.variable} suppressHydrationWarning>
      <body>
        <PrefsProvider initial={{ ...prefs, lang }}>
          <I18nProvider lang={lang} dict={dictionaryFor(lang)}>
            <PublicChrome />
            <OfflineInit />
            <OfflineBanner />
            {children}
            <Suspense fallback={null}><AdminChrome /></Suspense>
            <Toaster />
          </I18nProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}

// The version badge is only for the platform owner and for an admin who is viewing as a user. The lookup runs
// here, in its own Suspense boundary, so it never delays the first paint of the page.
async function AdminChrome() {
  const [admin, viewingAs] = await Promise.all([getPlatformAdmin(), getImpersonation()]);
  return admin || viewingAs ? <VersionBadge /> : null;
}
