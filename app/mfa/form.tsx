"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui";

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
  const [enrollError, setEnrollError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
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
      if (err || !data) { setEnrollError(true); return; }
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
      codeRef.current?.focus();
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function copyKey() {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the key is selectable, copying by hand still works */
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {!factorId && (
        <div className="space-y-4">
          <ol className="space-y-2.5 text-sm">
            {[
              <>מתקינים אפליקציית אימות בטלפון, למשל <bdi dir="ltr">Google Authenticator</bdi> או <bdi dir="ltr">Authy</bdi>.</>,
              <>סורקים את הקוד, או מזינים את המפתח ידנית.</>,
              <>מזינים כאן את הקוד שמופיע באפליקציה.</>,
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="num mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent">{i + 1}</span>
                <span className="min-w-0 flex-1 leading-6 text-muted">{t}</span>
              </li>
            ))}
          </ol>
          {enrollError ? (
            <div role="alert" className="rounded-xl bg-bad-soft px-4 py-4 text-center">
              <p className="flex items-start justify-center gap-2 text-sm leading-relaxed text-bad">
                <span className="mt-0.5 shrink-0"><Icon name="alert" /></span>
                <span>לא הצלחנו להתחיל את ההגדרה. נסו שוב בעוד רגע.</span>
              </p>
              <button type="button" className="btn btn-sm mt-3" onClick={() => window.location.reload()}>נסו שוב</button>
            </div>
          ) : enrollment ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-paper px-4 py-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollment.qr} alt="קוד QR לחיבור אפליקציית האימות" width={176} height={176} className="h-44 w-44 rounded-xl bg-white p-2" />
              <p className="mt-1 text-xs text-[#4b5563]">אי אפשר לסרוק? מזינים את המפתח ידנית:</p>
              <div className="flex w-full items-center justify-center gap-2">
                <code dir="ltr" className="num min-w-0 select-all break-all rounded-lg bg-surface px-3 py-2 text-center text-sm tracking-wide">{enrollment.secret}</code>
                <button type="button" onClick={copyKey} className="btn btn-sm shrink-0 !min-h-11" aria-label="העתקת המפתח">
                  {copied ? "הועתק" : "העתקה"}
                </button>
              </div>
              <span className="sr-only" role="status">{copied ? "המפתח הועתק" : ""}</span>
            </div>
          ) : (
            <div role="status" aria-live="polite" className="flex flex-col items-center gap-2 rounded-2xl bg-paper px-4 py-5">
              <div className="h-44 w-44 animate-pulse rounded-xl bg-line" aria-hidden="true" />
              <p className="text-xs text-[#4b5563]">מכין קוד…</p>
              <div className="h-11" aria-hidden="true" />
            </div>
          )}
        </div>
      )}
      {!enrollError && (
        <>
          <div>
            <label htmlFor="code" className="lbl">קוד בן 6 ספרות</label>
            <input
              id="code" name="code" ref={codeRef} className="field num text-center text-xl tracking-[0.4em]" dir="ltr"
              inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required
              autoFocus={!!factorId} aria-invalid={error ? true : undefined} aria-describedby={error ? "code-error" : undefined}
            />
          </div>
          {error && (
            <p id="code-error" role="alert" className="flex items-start gap-2 rounded-xl bg-bad-soft px-4 py-3 text-sm leading-relaxed text-bad">
              <span className="mt-0.5 shrink-0"><Icon name="alert" /></span>
              <span>{error}</span>
            </p>
          )}
          <button className="btn btn-primary w-full" disabled={busy || !activeId || code.length !== 6}>
            {busy ? "מאמת…" : "אימות"}
          </button>
        </>
      )}
    </form>
  );
}
