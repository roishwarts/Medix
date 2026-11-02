"use client";

import { useId, useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { resetTeamMemberMfa, resetTeamMemberPassword, setTeamMemberDisabled, setTeamMemberRole } from "./actions";

export function TeamMemberRow({
  id, name, username, role, disabled, mfa, isSelf,
}: {
  id: string; name: string; username: string; role: "staff" | "doctor"; disabled: boolean; mfa: boolean; isSelf: boolean;
}) {
  const t = useT();
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

  function toggleDisabled() {
    const next = !disabled;
    if (next && !confirm(t("להשבית את {name}? הכניסה תיחסם מיד.", { name }))) return;
    setMsg(null);
    start(async () => {
      const res = await setTeamMemberDisabled(id, next);
      if (res.error) setMsg({ error: res.error });
    });
  }

  function changeRole(next: "staff" | "doctor") {
    if (next === role) return;
    if (!confirm(t("לשנות את התפקיד של {name} ל{role}?", { name, role: next === "doctor" ? t("רופא") : t("צוות") }))) return;
    setMsg(null);
    start(async () => {
      const res = await setTeamMemberRole(id, next);
      if (res.error) setMsg({ error: res.error });
    });
  }

  function resetMfa() {
    if (!confirm(t("לאפס את האימות הדו־שלבי של {name}? ההגדרה תתבצע מחדש בכניסה הבאה.", { name }))) return;
    setMsg(null);
    start(async () => {
      const res = await resetTeamMemberMfa(id);
      if (res.error) setMsg({ error: res.error });
      else setMsg({ ok: t("האימות הדו-שלבי אופס") });
    });
  }

  function reset(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await resetTeamMemberPassword(id, String(formData.get("password") ?? ""));
      if (res.error) setMsg({ error: res.error });
      else { setMsg({ ok: t("הסיסמה עודכנה") }); setResetting(false); setPw(""); }
    });
  }

  const btn = "btn btn-sm min-h-11 max-sm:flex-1 sm:min-h-9";
  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 max-w-full">
          <p className={`break-words font-medium ${disabled ? "text-muted line-through" : ""}`}>
            {name} {isSelf && <span className="text-sm font-normal text-muted">({t("את/ה")})</span>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span dir="ltr" className="num break-all">{username}</span>
            {disabled && <span className="pill pill-bad">{t("מושבת")}</span>}
            {mfa && <span className="pill pill-ok">{t("אימות דו-שלבי")}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
          <select
            aria-label={t("תפקיד")} className="field !min-h-9 w-auto py-1 text-sm"
            value={role} disabled={pending || isSelf} onChange={(e) => changeRole(e.target.value as "staff" | "doctor")}
          >
            <option value="staff">{t("צוות")}</option>
            <option value="doctor">{t("רופא")}</option>
          </select>
          {mfa && <button className={btn} disabled={pending} onClick={resetMfa}>{t("איפוס אימות דו-שלבי")}</button>}
          <button className={btn} disabled={pending} aria-expanded={resetting} onClick={() => { setResetting(!resetting); setMsg(null); }}>{t("איפוס סיסמה")}</button>
          {!isSelf && (
            <button className={`${btn} ${disabled ? "" : "btn-danger"}`} disabled={pending} onClick={toggleDisabled}>
              {disabled ? t("הפעלה מחדש") : t("השבתה")}
            </button>
          )}
        </div>
      </div>
      {resetting && (
        <form action={reset} className="mt-3 max-w-md">
          <label htmlFor={pwId} className="lbl">{t("סיסמה חדשה")} <span className="font-normal text-muted">{t("(לפחות 8 תווים)")}</span></label>
          <div className="flex gap-2">
            <input id={pwId} name="password" className="field min-w-0" dir="ltr" minLength={8} value={pw}
              onChange={(e) => setPw(e.target.value)} autoComplete="off" required />
            <button type="button" className="btn btn-sm min-h-11 shrink-0" onClick={generate}>{t("יצירה")}</button>
            <button className="btn btn-primary btn-sm min-h-11 shrink-0" disabled={pending}>{pending ? t("שומר…") : t("שמירה")}</button>
          </div>
        </form>
      )}
      {msg?.error && <p role="alert" className="mt-2 text-sm text-bad">{msg.error}</p>}
      {msg?.ok && <p role="status" className="mt-2 text-sm text-ok">{msg.ok}</p>}
    </li>
  );
}
