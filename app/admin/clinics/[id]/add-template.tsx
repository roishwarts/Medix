"use client";

import { useState, useTransition } from "react";
import { addTemplateToClinic } from "../../actions";

export function AddTemplate({ clinicId, bases }: { clinicId: string; bases: { id: string; name: string }[] }) {
  const [baseId, setBaseId] = useState(bases[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (bases.length === 0) return null;
  return (
    <div className="card mt-3 p-4">
      <label htmlFor="base" className="lbl">הוספת תבנית בסיס</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select id="base" className="field min-w-0 sm:flex-1" value={baseId} onChange={(e) => setBaseId(e.target.value)} disabled={pending}>
          {bases.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button type="button" className="btn btn-sm min-h-11 shrink-0 sm:min-h-11" disabled={pending} onClick={() => {
          setError(null);
          start(async () => { const res = await addTemplateToClinic(clinicId, baseId); if (res.error) setError(res.error); });
        }}>{pending ? "מעתיק…" : "הוספה למרפאה"}</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
