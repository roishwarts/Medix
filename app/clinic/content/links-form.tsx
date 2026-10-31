"use client";

import { useT } from "@/components/i18n-provider";
import { useId, useState, useTransition } from "react";
import { Icon } from "@/components/ui";
import { addClinicLink, removeClinicLink } from "./actions";

type Link = { id: string; label: string; url: string };

export function LinksForm({ links }: { links: Link[] }) {
  const t = useT();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [pending, start] = useTransition();
  const labelId = useId();
  const urlId = useId();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdded(false);
    start(async () => {
      const res = await addClinicLink(label, url);
      if (res.error) setError(res.error);
      else { setLabel(""); setUrl(""); setAdded(true); }
    });
  }

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="font-semibold">{t("קישורים")}</h3>
      <p className="mt-1 text-sm text-muted">{t("אתר, אינסטגרם, פייסבוק, וכל קישור אחר שתרצו לשתף עם מטופלים. מופיע בעמוד המסלול של כל המטופלים במרפאה.")}</p>
      {links.length > 0 ? (
        <ul className="mt-3 divide-y divide-line">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{l.label}</p>
                <p className="truncate text-sm text-muted" dir="ltr">{l.url}</p>
              </div>
              <button
                type="button"
                aria-label={t("הסרת {name}", { name: l.label })}
                disabled={pending}
                className="relative grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-black/10 hover:text-ink disabled:opacity-50"
                onClick={() => { if (confirm(t("להסיר את \"{label}\"?", { label: l.label }))) start(async () => { await removeClinicLink(l.id); }); }}
              >
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl bg-paper px-3 py-3 text-sm text-muted">{t("עוד לא נוספו קישורים.")}</p>
      )}
      <form onSubmit={add} className="mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <div>
          <label htmlFor={labelId} className="sr-only">{t("שם הקישור")}</label>
          <input id={labelId} className="field" placeholder={t("שם, למשל: אינסטגרם")} value={label} onChange={(e) => { setLabel(e.target.value); setAdded(false); }} maxLength={60} autoComplete="off" />
        </div>
        <div>
          <label htmlFor={urlId} className="sr-only">{t("כתובת")}</label>
          <input id={urlId} className="field" placeholder="https://..." dir="ltr" value={url} onChange={(e) => { setUrl(e.target.value); setAdded(false); }} autoComplete="off" />
        </div>
        <button className="btn btn-sm min-h-11 shrink-0" disabled={pending || !label.trim() || !url.trim()}>
          {pending ? t("מוסיף…") : t("הוספה")}
        </button>
      </form>
      {(added || error) && (
        <div className="mt-2 flex items-center gap-3">
          {added && <span role="status" className="text-sm text-ok">{t("נוסף")}</span>}
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        </div>
      )}
    </div>
  );
}
