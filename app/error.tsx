"use client";

// Next.js error boundary for this route tree. Must be a Client Component. No i18n/profile context
// is guaranteed here (the error may be why that context failed to load), so this stays static and
// simple — matching the login page's centered-card look.
export default function GlobalErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
      <div className="card p-6 sm:p-8">
        <h1 className="display text-2xl">משהו השתבש</h1>
        <p className="mt-2 text-muted">ננסה שוב, או חזרו לדף הראשי אם זה חוזר.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" className="btn btn-primary" onClick={reset}>ניסיון נוסף</button>
          <a href="/" className="btn">לדף הראשי</a>
        </div>
      </div>
    </main>
  );
}
