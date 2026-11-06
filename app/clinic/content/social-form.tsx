"use client";

import { useT } from "@/components/i18n-provider";
import { useId, useState, useTransition } from "react";
import { saveClinicSocial } from "./actions";

export function SocialForm({ initial }: { initial: { facebook: string | null; instagram: string | null; youtube: string | null } }) {
  const t = useT();
  const [fb, setFb] = useState(initial.facebook ?? "");
  const [ig, setIg] = useState(initial.instagram ?? "");
  const [yt, setYt] = useState(initial.youtube ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ids = [useId(), useId(), useId()];
  const fields = [
    { id: ids[0], label: t("פייסבוק"), v: fb, set: setFb, ph: "https://www.facebook.com/…" },
    { id: ids[1], label: t("אינסטגרם"), v: ig, set: setIg, ph: "https://www.instagram.com/…" },
    { id: ids[2], label: t("יוטיוב"), v: yt, set: setYt, ph: "https://www.youtube.com/…" },
  ];
  function save() {
    setError(null); setSaved(false);
    start(async () => {
      const res = await saveClinicSocial(fb, ig, yt);
      if (res.error) setError(res.error); else setSaved(true);
    });
  }
  return (
    <div className="card p-4 sm:p-5">
      <h3 className="font-semibold">{t("הרשתות החברתיות של המרפאה")}</h3>
      <p className="mt-1 text-sm text-muted">{t("מוצגות למטופלים בתחתית עמוד המסלול. אפשר להשאיר ריק.")}</p>
      <div className="mt-4 grid gap-4">
        {fields.map((f) => (
          <div key={f.id}>
            <label htmlFor={f.id} className="lbl">{f.label}</label>
            <input id={f.id} type="url" dir="ltr" inputMode="url" className="field" value={f.v} placeholder={f.ph} autoComplete="off" maxLength={300}
              onChange={(e) => { f.set(e.target.value); setSaved(false); }} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={pending}>{pending ? t("שומר…") : t("שמירה")}</button>
        {saved && <span role="status" className="text-sm text-ok">{t("נשמר")}</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
