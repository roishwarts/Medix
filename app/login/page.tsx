import Link from "next/link";
import { LoginForm } from "./form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
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
