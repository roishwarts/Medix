"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui";
import { addClinicOption, removeClinicOption } from "../../actions";

type Item = { id: string; name: string };

function OptionList({ clinicId, kind, title, hint, items }: { clinicId: string; kind: "hospital" | "company"; title: string; hint: string; items: Item[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await addClinicOption(clinicId, kind, name);
      if (res.error) setError(res.error);
      else setName("");
    });
  }

  return (
    <div className="card p-4">
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((o) => (
          <li key={o.id} className="pill pill-neutral gap-1.5 py-1 ps-3 pe-1.5 text-sm">
            {o.name}
            <button
              type="button" aria-label={`הסרת ${o.name}`} disabled={pending}
              className="grid size-5 place-items-center rounded-full text-muted hover:bg-black/10 hover:text-ink"
              onClick={() => { if (confirm(`להסיר את "${o.name}" מהרשימה? מטופלים שכבר שויכו אליו לא ישתנו.`)) start(async () => { await removeClinicOption(o.id); }); }}
            >
              <Icon name="trash" size={12} />
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted">{hint}</li>}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="הוספה…" aria-label={`הוספה: ${title}`} />
        <button className="btn btn-sm shrink-0 self-center" disabled={pending || !name.trim()}>הוספה</button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}

export function ClinicOptions({ clinicId, hospitals, companies }: { clinicId: string; hospitals: Item[]; companies: Item[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <OptionList clinicId={clinicId} kind="hospital" title="בתי חולים" hint="עוד לא הוגדרו בתי חולים." items={hospitals} />
      <OptionList clinicId={clinicId} kind="company" title="חברות" hint="עוד לא הוגדרו חברות (למשל Mako, J&J, Zimmer)." items={companies} />
    </div>
  );
}
