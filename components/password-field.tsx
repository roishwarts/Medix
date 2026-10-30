"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";

function generate() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function PasswordField({ name = "password", label, id }: { name?: string; label?: string; id?: string }) {
  const t = useT();
  const fieldId = id ?? name;
  const [value, setValue] = useState("");
  return (
    <div>
      <label htmlFor={fieldId} className="lbl">{label ?? t("סיסמה")}</label>
      <div className="flex gap-2">
        <input id={fieldId} name={name} className="field" dir="ltr" minLength={8} value={value}
          onChange={(e) => setValue(e.target.value)} autoComplete="off" required />
        <button type="button" className="btn btn-sm shrink-0" onClick={() => setValue(generate())}>{t("יצירה")}</button>
      </div>
    </div>
  );
}
