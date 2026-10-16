import { LoginForm } from "./form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <p className="eyebrow mb-3">כניסה למערכת</p>
      <h1 className="display mb-8 text-4xl">מסע המטופל</h1>
      {error === "profile" && (
        <p className="mb-4 rounded bg-bad-soft px-3 py-2 text-sm text-bad">
          למשתמש הזה אין פרופיל במערכת. יש לפנות למרפאה.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
