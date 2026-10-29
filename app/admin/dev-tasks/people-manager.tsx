"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui";
import { addPerson, removePerson } from "./actions";

export type Person = { id: string; name: string };

// The names tasks can be assigned to. Anyone can be added or removed; removing leaves their tasks unassigned.
export function PeopleManager({ people }: { people: Person[] }) {
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await addPerson(name);
      if (res.error) setError(res.error);
      else setName("");
    });
  }

  return (
    <details className="fold mt-5">
      <summary>
        <span className="font-medium">אחראים</span>
        <span className="text-sm text-muted">{people.length > 0 ? people.map((p) => p.name).join(", ") : "עדיין לא הוגדרו"}</span>
      </summary>
      <div className="card mt-2 p-4">
        {people.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {people.map((p) => (
              <li key={p.id} className="pill pill-neutral gap-1.5 py-1 ps-3 pe-1.5 text-sm">
                {p.name}
                {confirming === p.id ? (
                  <>
                    <button type="button" className="rounded-full bg-bad-soft px-2 py-0.5 text-xs font-medium text-bad" disabled={pending}
                      onClick={() => start(async () => { const res = await removePerson(p.id); setConfirming(null); if (res.error) setError(res.error); })}>
                      להסיר? המשימות שלו יישארו ללא אחראי
                    </button>
                    <button type="button" className="rounded-full px-2 py-0.5 text-xs text-muted" onClick={() => setConfirming(null)}>ביטול</button>
                  </>
                ) : (
                  <button type="button" aria-label={`הסרת ${p.name}`} disabled={pending}
                    className="relative grid size-5 place-items-center rounded-full text-muted before:absolute before:-inset-2.5 before:content-[''] hover:bg-black/10 hover:text-ink"
                    onClick={() => setConfirming(p.id)}>
                    <Icon name="trash" size={12} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="flex gap-2">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="שם חדש…" aria-label="הוספת אחראי" autoComplete="off" />
          <button className="btn btn-sm min-h-11 shrink-0 self-center sm:min-h-9" disabled={pending || !name.trim()}>{pending ? "מוסיף…" : "הוספה"}</button>
        </form>
        {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
      </div>
    </details>
  );
}
