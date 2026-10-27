import Link from "next/link";
import { Icon } from "@/components/ui";
import { LoginForm } from "./form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <div className="card p-6 sm:p-8">
        <h1 className="display text-3xl">כניסה</h1>
        <p className="mb-6 mt-1.5 text-muted">הזן/י את שם המשתמש והסיסמה שקיבלת מהמרפאה.</p>
        {error === "profile" && (
          <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl bg-bad-soft px-4 py-3 text-sm leading-relaxed text-bad">
            <span className="mt-0.5 shrink-0"><Icon name="alert" /></span>
            <span>למשתמש הזה אין חשבון פעיל במערכת, או שהחשבון הושבת. יש לפנות למרפאה.</span>
          </p>
        )}
        <LoginForm />
      </div>
      <Link href="/forgot" className="mx-auto mt-4 inline-flex min-h-11 items-center px-3 text-sm text-muted underline underline-offset-4 hover:text-ink">
        שכחתי סיסמה
      </Link>
    </main>
  );
}
