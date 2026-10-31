import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { formatDate } from "@/lib/dates";

type Referral = { id: string; recipient: string; reason: string; createdAt: string };

export async function ReferralsCard({ patientId, canCreate, items }: { patientId: string; canCreate: boolean; items: Referral[] }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <div className="card divide-y divide-line">
      {items.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted">{t("אין הפניות עדיין.")}</p>
      ) : (
        items.map((r) => (
          <Link
            key={r.id}
            href={`/clinic/patients/${patientId}/referrals/${r.id}/print`}
            target="_blank"
            className="block px-3 py-2.5 text-sm hover:bg-accent-soft"
          >
            <p className="font-medium">{r.recipient}</p>
            <p className="mt-0.5 truncate text-muted">{r.reason}</p>
            <p className="mt-0.5 text-xs text-muted">{formatDate(r.createdAt, lang)}</p>
          </Link>
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
