"use client";

import { useT } from "@/components/i18n-provider";
import { useId, useState, useTransition } from "react";
import { Icon } from "@/components/ui";
import { addClinicOption, removeClinicOption } from "../../actions";

type Item = { id: string; name: string };

function OptionList({ clinicId, kind, title, hint, placeholder, items }: { clinicId: string; kind: "hospital" | "company"; title: string; hint: React.ReactNode; placeholder: string; items: Item[] }) {
  const t = useT();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputId = useId();
  const errId = useId();

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
    <div className="card p-4 sm:p-5">
      <h3 className="font-semibold">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((o) => (
            <li key={o.id} className="pill pill-neutral min-h-9 max-w-full gap-1 whitespace-normal py-0 ps-3 pe-1 text-sm">
              <span className="min-w-0 break-words py-1">{o.name}</span>
              <button
                type="button" aria-label={t("הסרת {name}", { name: o.name })} disabled={pending}
                className="relative grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-black/10 hover:text-ink focus-visible:!rounded-full disabled:opacity-50 after:absolute after:-inset-1.5 after:content-['']"
                onClick={() => { if (confirm(t("להסיר את \"{name}\" מהרשימה? מטופלים שכבר שויכו אליו לא ישתנו.", { name: o.name }))) start(async () => { await removeClinicOption(o.id); }); }}
              >
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl bg-paper px-3 py-3 text-sm text-muted">{hint}</p>
      )}
      <form onSubmit={add} className="mt-4 flex gap-2">
        <input
          id={inputId} className="field min-w-0" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
          placeholder={placeholder} aria-label={t("הוספה: {title}", { title })} autoComplete="off"
          aria-invalid={error ? true : undefined} aria-describedby={error ? errId : undefined}
        />
        <button className="btn btn-sm min-h-11 shrink-0" disabled={pending || !name.trim()}>{pending ? t("מוסיף…") : t("הוספה")}</button>
      </form>
      {error && <p id={errId} role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}

export function ClinicOptions({ clinicId, hospitals, companies }: { clinicId: string; hospitals: Item[]; companies: Item[] }) {
  const t = useT();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OptionList clinicId={clinicId} kind="hospital" title={t("בתי חולים")} hint={t("עוד לא הוגדרו בתי חולים.")} placeholder={t("שם בית חולים")} items={hospitals} />
      <OptionList clinicId={clinicId} kind="company" title={t("חברות")} hint={<>{t("עוד לא הוגדרו חברות. למשל:")} <bdi dir="ltr">Mako, J&amp;J, Zimmer</bdi></>} placeholder={t("שם חברה")} items={companies} />
    </div>
  );
}
