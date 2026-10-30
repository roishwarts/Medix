"use client";

import { useT } from "@/components/i18n-provider";
import { useState, useTransition } from "react";
import { NavigateButtons } from "@/components/navigate-buttons";
import { setClinicAddress } from "../../actions";

export function ClinicAddress({ clinicId, initial }: { clinicId: string; initial: string }) {
  const t = useT();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    start(async () => {
      const res = await setClinicAddress(clinicId, value);
      if (res.error) setError(res.error);
      else { setSaved(value.trim()); setOk(true); }
    });
  }

  return (
    <form onSubmit={save} className="card p-4">
      <label htmlFor="clinic-address" className="lbl">{t("כתובת המרפאה")}</label>
      <div className="flex gap-2">
        <input
          id="clinic-address" className="field" value={value} maxLength={200} autoComplete="off"
          onChange={(e) => { setValue(e.target.value); setOk(false); }}
          placeholder={t("למשל: הרצל 12, תל אביב")}
          aria-describedby="clinic-address-hint"
        />
        <button className="btn btn-primary shrink-0 self-center" disabled={pending || value.trim() === saved}>{pending ? t("שומר…") : t("שמירה")}</button>
      </div>
      <p id="clinic-address-hint" className="mt-2 text-sm text-muted">
        {t("מוצגת למטופלים בתורים שנקבעו במרפאה, עם כפתורי ניווט (Waze ו-Google Maps).")}
      </p>
      {saved && <NavigateButtons query={saved} className="mt-3" />}
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
      {ok && <p role="status" className="mt-2 text-sm text-ok">{t("נשמר")}</p>}
    </form>
  );
}
