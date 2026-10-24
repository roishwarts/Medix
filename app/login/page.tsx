import Link from "next/link";
import { LoginForm } from "./form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mx-auto mb-8 grid size-14 place-items-center rounded-2xl bg-accent text-white shadow-[0_6px_16px_rgb(47_95_224/0.28)]" aria-hidden>
        <svg width="26" height="26" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.2 3.2L13 4.8" /></svg>
      </div>
      {error === "profile" && (
        <p className="mb-4 rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
          למשתמש הזה אין חשבון פעיל במערכת, או שהחשבון הושבת. יש לפנות למרפאה.
        </p>
      )}
      <LoginForm />
      <Link href="/forgot" className="mt-5 text-center text-sm text-muted underline underline-offset-4 hover:text-ink">שכחתי סיסמה</Link>
    </main>
  );
}
