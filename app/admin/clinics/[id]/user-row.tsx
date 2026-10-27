"use client";

import { useId, useState, useTransition } from "react";
import { resetUserMfa, resetUserPassword, setUserDisabled } from "../../actions";

export function UserRow({ id, name, username, role, disabled, mfa }: { id: string; name: string; username: string; role: string; disabled: boolean; mfa: boolean }) {
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const [pw, setPw] = useState("");
  const pwId = useId();

  function generate() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint32Array(12));
    setPw(Array.from(bytes, (b) => chars[b % chars.length]).join(""));
  }

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
      else { setMsg({ ok: "הסיסמה עודכנה" }); setResetting(false); setPw(""); }
    });
  }

  const btn = "btn btn-sm min-h-11 max-sm:flex-1 sm:min-h-9";
  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 max-w-full">
          <p className={`break-words font-medium ${disabled ? "text-muted line-through" : ""}`}>{name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span>{role === "doctor" ? "רופא" : "צוות"}</span>
            <span aria-hidden="true">·</span>
            <span dir="ltr" className="num break-all">{username}</span>
            {disabled && <span className="pill pill-bad">מושבת</span>}
            {mfa && <span className="pill pill-ok">אימות דו-שלבי</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 max-sm:w-full">
          {mfa && <button className={btn} disabled={pending} onClick={resetMfa}>איפוס אימות דו-שלבי</button>}
          <button className={btn} disabled={pending} aria-expanded={resetting} onClick={() => { setResetting(!resetting); setMsg(null); }}>איפוס סיסמה</button>
          <button className={`${btn} ${disabled ? "" : "btn-danger"}`} disabled={pending} onClick={toggle}>
            {disabled ? "הפעלה מחדש" : "השבתה"}
          </button>
        </div>
      </div>
      {resetting && (
        <form action={reset} className="mt-3 max-w-md">
          <label htmlFor={pwId} className="lbl">סיסמה חדשה <span className="font-normal text-muted">(לפחות 8 תווים)</span></label>
          <div className="flex gap-2">
            <input id={pwId} name="password" className="field min-w-0" dir="ltr" minLength={8} value={pw}
              onChange={(e) => setPw(e.target.value)} autoComplete="off" required />
            <button type="button" className="btn btn-sm min-h-11 shrink-0" onClick={generate}>יצירה</button>
            <button className="btn btn-primary btn-sm min-h-11 shrink-0" disabled={pending}>{pending ? "שומר…" : "שמירה"}</button>
          </div>
        </form>
      )}
      {msg?.error && <p role="alert" className="mt-2 text-sm text-bad">{msg.error}</p>}
      {msg?.ok && <p role="status" className="mt-2 text-sm text-ok">{msg.ok}</p>}
    </li>
  );
}
