"use client";

import { useState, useTransition } from "react";
import { addTemplateToClinic } from "../../actions";

export function AddTemplate({ clinicId, bases }: { clinicId: string; bases: { id: string; name: string }[] }) {
  const [baseId, setBaseId] = useState(bases[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (bases.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <div className="min-w-56">
        <label htmlFor="base" className="lbl">הוספת תבנית בסיס</label>
        <select id="base" className="field" value={baseId} onChange={(e) => setBaseId(e.target.value)}>
          {bases.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <button className="btn btn-sm mb-0.5" disabled={pending} onClick={() => {
        setError(null);
        start(async () => { const res = await addTemplateToClinic(clinicId, baseId); if (res.error) setError(res.error); });
      }}>{pending ? "מעתיק…" : "הוספה למרפאה"}</button>
      {error && <span role="alert" className="text-sm text-bad">{error}</span>}
    </div>
  );
}
