import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { formatDate, israelParts } from "@/lib/dates";
import { ReferralResult } from "./referral-result";

type Referral = {
  id: string; recipient: string; reason: string; createdAt: string;
  resultStatus: "pending" | "received"; resultName: string | null; resultUrl: string | null;
};

export async function ReferralsCard({ patientId, canCreate, items }: { patientId: string; canCreate: boolean; items: Referral[] }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <div className="card divide-y divide-line">
      {items.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted">{t("אין הפניות עדיין.")}</p>
      ) : (
        items.map((r) => (
          <div key={r.id} className="px-3 py-2.5 text-sm">
            <Link href={`/clinic/patients/${patientId}/referrals/${r.id}/print`} target="_blank" className="block -m-1 rounded-lg p-1 hover:bg-accent-soft">
              <p className="font-medium">{r.recipient}</p>
              <p className="mt-0.5 truncate text-muted">{r.reason}</p>
              <p className="mt-0.5 text-xs text-muted">{formatDate(israelParts(r.createdAt).date, lang)}</p>
            </Link>
            <ReferralResult referralId={r.id} status={r.resultStatus} resultName={r.resultName} resultUrl={r.resultUrl} />
          </div>
        ))
      )}
      {canCreate && (
        <Link href={`/clinic/patients/${patientId}/referrals/new`} className="block px-3 py-2.5 text-sm font-medium text-accent hover:underline">
          {t("הפניה חדשה")}
        </Link>
      )}
    </div>
  );
}
