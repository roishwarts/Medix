import { ForgotForm } from "./form";

export default function ForgotPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="display mb-2 text-3xl">שכחתי סיסמה</h1>
      <p className="mb-8 text-muted">הזן/י את שם המשתמש ונעביר את הבקשה למרפאה. הצוות ישלח לך קישור לבחירת סיסמה חדשה.</p>
      <ForgotForm />
    </main>
  );
}
