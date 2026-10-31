import { PublicBrand } from "@/components/public-brand";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { LoginForm } from "./form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <PublicBrand logo />
      <div className="card p-6 sm:p-8">
        <h1 className="display mb-6 text-3xl">{t("כניסה")}</h1>
        {error === "profile" && (
          <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl bg-bad-soft px-4 py-3 text-sm leading-relaxed text-bad">
            <span className="mt-0.5 shrink-0"><Icon name="alert" /></span>
            <span>{t("למשתמש הזה אין חשבון פעיל במערכת, או שהחשבון הושבת. יש לפנות למרפאה.")}</span>
          </p>
        )}
        <LoginForm />
      </div>
      <Link href="/forgot" className="public-link mx-auto mt-4 inline-flex min-h-11 items-center px-3 text-sm text-muted underline underline-offset-4 hover:text-ink">
        {t("שכחתי סיסמה")}
      </Link>
    </main>
  );
}
