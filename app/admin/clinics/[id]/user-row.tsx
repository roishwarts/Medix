"use client";

import { useState, useTransition } from "react";
import { PasswordField } from "@/components/password-field";
import { resetUserMfa, resetUserPassword, setUserDisabled } from "../../actions";

export function UserRow({ id, name, username, role, disabled, mfa }: { id: string; name: string; username: string; role: string; disabled: boolean; mfa: boolean }) {
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !disabled;
    if (next && !confirm(`להשבית את ${name}? הכניסה תיחסם מיד.`)) return;
    setMsg(null);
    start(async () => {
      const res = await setUserDisabled(id, next);
      if (res.error) setMsg({ error: res.error });
    });
  }

  function resetMfa() {
    if (!confirm(`לאפס את האימות הדו-שלבי של ${name}? ההגדרה תתבצע מחדש בכניסה הבאה.`)) return;
    setMsg(null);
    start(async () => {
      const res = await resetUserMfa(id);
      if (res.error) setMsg({ error: res.error });
      else setMsg({ ok: "האימות הדו-שלבי אופס" });
    });
  }

  function reset(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await resetUserPassword(id, String(formData.get("password") ?? ""));
      if (res.error) setMsg({ error: res.error });
      else { setMsg({ ok: "הסיסמה עודכנה" }); setResetting(false); }
    });
  }

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`font-medium ${disabled ? "text-muted line-through" : ""}`}>{name}</p>
          <p className="text-sm text-muted">
            {role === "doctor" ? "רופא" : "צוות"} · <span dir="ltr" className="num">{username}</span>
            {disabled && <span className="pill pill-bad ms-2">מושבת</span>}
            {mfa && <span className="pill pill-ok ms-2">אימות דו-שלבי</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mfa && <button className="btn btn-sm" disabled={pending} onClick={resetMfa}>איפוס אימות דו-שלבי</button>}
          <button className="btn btn-sm" disabled={pending} onClick={() => { setResetting(!resetting); setMsg(null); }}>איפוס סיסמה</button>
          <button className={`btn btn-sm ${disabled ? "" : "btn-danger"}`} disabled={pending} onClick={toggle}>
            {disabled ? "הפעלה מחדש" : "השבתה"}
          </button>
        </div>
      </div>
      {resetting && (
        <form action={reset} className="mt-3 flex max-w-md items-end gap-2">
          <div className="flex-1"><PasswordField label="סיסמה חדשה" /></div>
          <button className="btn btn-primary btn-sm mb-0.5" disabled={pending}>שמירה</button>
        </form>
      )}
      {msg?.error && <p role="alert" className="mt-2 text-sm text-bad">{msg.error}</p>}
      {msg?.ok && <p className="mt-2 text-sm text-ok">{msg.ok}</p>}
    </div>
  );
}
