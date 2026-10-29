import { ForgotForm } from "./form";

export const metadata = { title: "שכחתי סיסמה" };

export default function ForgotPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <div className="card p-6 sm:p-8">
        <ForgotForm />
      </div>
    </main>
  );
}
