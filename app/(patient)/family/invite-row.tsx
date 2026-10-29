"use client";

import { useState, useTransition } from "react";
import { revokeInvite } from "./actions";

export function InviteRow({ id, name, relation, canAct, expires }: { id: string; name: string; relation: string; canAct: boolean; expires: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function revoke() {
    setError(null);
    start(async () => {
      const res = await revokeInvite(id);
      if (res?.error) { setError(res.error); setConfirming(false); }
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1 basis-48">
        <p className="break-words font-medium">{name ? `${name} · ${relation}` : relation}</p>
        <p className="text-sm text-muted">{canAct ? "עם הרשאת פעולה" : "צפייה בלבד"} · תקפה עד <span className="num">{expires}</span></p>
        {error && <p role="alert" className="mt-1 text-sm text-bad">{error}</p>}
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`ביטול ההזמנה ל${name || relation}`}>
          <span className="text-sm">לבטל את ההזמנה?</span>
          <button className="btn btn-danger btn-sm" disabled={pending} onClick={revoke}>{pending ? "מבטל…" : "כן, לבטל"}</button>
          <button className="btn btn-quiet btn-sm" disabled={pending} onClick={() => setConfirming(false)}>חזרה</button>
        </div>
      ) : (
        <button className="btn btn-sm" onClick={() => setConfirming(true)} aria-label={`ביטול ההזמנה ל${name || relation}`}>ביטול הזמנה</button>
      )}
    </li>
  );
}
