"use client";

import { useTransition } from "react";
import { revokeInvite } from "./actions";

export function InviteRow({ id, name, relation, canAct, expires }: { id: string; name: string; relation: string; canAct: boolean; expires: string }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="font-medium">{name ? `${name} · ${relation}` : relation}</p>
        <p className="text-sm text-muted">{canAct ? "עם הרשאת פעולה" : "צפייה בלבד"} · תקפה עד {expires}</p>
      </div>
      <button className="btn btn-sm" disabled={pending} onClick={() => start(async () => { await revokeInvite(id); })}>
        ביטול
      </button>
    </li>
  );
}
