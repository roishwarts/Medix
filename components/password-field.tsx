"use client";

import { useState } from "react";

function generate() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function PasswordField({ name = "password", label = "סיסמה", id }: { name?: string; label?: string; id?: string }) {
  const fieldId = id ?? name;
  const [value, setValue] = useState("");
  return (
    <div>
      <label htmlFor={fieldId} className="lbl">{label}</label>
      <div className="flex gap-2">
        <input id={fieldId} name={name} className="field" dir="ltr" minLength={8} value={value}
          onChange={(e) => setValue(e.target.value)} autoComplete="off" required />
        <button type="button" className="btn btn-sm shrink-0" onClick={() => setValue(generate())}>יצירה</button>
      </div>
    </div>
  );
}
