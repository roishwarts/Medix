"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Enrollment = { id: string; qr: string; secret: string };

// Supabase returns the QR as an unencoded SVG data URL; encode it so browsers always render it.
function qrSrc(qr: string) {
  const m = qr.match(/^data:image\/svg\+xml;(?:charset=)?utf-8,(.*)$/is);
  return m ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(decodeURIComponent(safe(m[1])))}` : qr;
}
const safe = (v: string) => v.replace(/%(?![0-9a-fA-F]{2})/g, "%25");

export function MfaForm({ factorId }: { factorId: string | null }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  // First time: create a new authenticator factor and show its QR code.
  useEffect(() => {
    if (factorId || started.current) return;
    started.current = true;
    (async () => {
      const supabase = createClient();
      // Drop half-finished enrollments from earlier attempts.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `app-${Date.now()}` });
      if (err || !data) { setError("לא הצלחנו להתחיל את ההגדרה. נסו לרענן את הדף."); return; }
      setEnrollment({ id: data.id, qr: qrSrc(data.totp.qr_code), secret: data.totp.secret });
    })();
  }, [factorId]);

  const activeId = factorId ?? enrollment?.id ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: activeId, code: code.trim() });
    if (err) {
      setError("הקוד שגוי או שפג תוקפו. נסו שוב עם הקוד הנוכחי.");
      setCode("");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!factorId && (
        <div className="card p-4">
          <ol className="list-decimal space-y-1 ps-5 text-sm text-muted">
            <li>מתקינים אפליקציית אימות (Google Authenticator, Microsoft Authenticator או Authy).</li>
            <li>סורקים את הקוד, או מזינים את המפתח ידנית.</li>
            <li>מזינים כאן את הקוד שמופיע באפליקציה.</li>
          </ol>
          {enrollment ? (
            <div className="mt-4 flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollment.qr} alt="קוד QR לחיבור אפליקציית האימות" width={176} height={176} className="rounded-xl bg-white p-2" />
              <p className="text-xs text-muted">מפתח ידני:</p>
              <code dir="ltr" className="num select-all break-all rounded-lg bg-paper px-3 py-1.5 text-sm">{enrollment.secret}</code>
            </div>
          ) : (
            !error && <p className="mt-4 text-center text-sm text-muted">מכין קוד…</p>
          )}
        </div>
      )}
      <div>
        <label htmlFor="code" className="lbl">קוד בן 6 ספרות</label>
        <input
          id="code" name="code" className="field num text-center text-xl tracking-[0.4em]" dir="ltr"
          inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required
        />
      </div>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !activeId || code.length !== 6}>
        {busy ? "מאמת…" : "אימות"}
      </button>
    </form>
  );
}
