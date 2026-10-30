import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { getLang, getPrefs } from "@/lib/prefs-server";
import { dictionaryFor } from "@/lib/i18n";
import { dirOf } from "@/lib/prefs";
import { I18nProvider } from "@/components/i18n-provider";
import { PrefsProvider } from "@/components/prefs-provider";
import { PublicChrome } from "@/components/public-chrome";
import { VersionBadge } from "@/components/version-badge";

const rubik = Rubik({
  subsets: ["hebrew", "latin", "cyrillic", "arabic"],
  variable: "--font-rubik",
  weight: ["400", "500", "600"],
  display: "swap",
});

const TITLE = "הכנה לניתוח";
const DESCRIPTION = "כל שלבי ההכנה, המסמכים והתורים שלך במקום אחד.";

// Absolute address used for the share image in link previews (WhatsApp, etc.).
const origin =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: "כניסה",
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: { type: "website", locale: "he_IL", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  appleWebApp: { capable: true, title: TITLE, statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#4b6584" }, { media: "(prefers-color-scheme: dark)", color: "#131417" }] };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [prefs, lang] = await Promise.all([getPrefs(), getLang()]);
  return (
    <html lang={lang} dir={dirOf(lang)} data-theme={prefs.theme} data-size={prefs.size} className={rubik.variable} suppressHydrationWarning>
      <body>
        <PrefsProvider initial={{ ...prefs, lang }}>
          <I18nProvider lang={lang} dict={dictionaryFor(lang)}>
            <PublicChrome />
            {children}
          </I18nProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
