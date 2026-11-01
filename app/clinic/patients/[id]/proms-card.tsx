import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { TIMEPOINT_LABEL, instrumentTitle, scoreLabel, type Instrument, type Timepoint } from "@/lib/proms";

type Row = { instrument: Instrument; timepoint: Timepoint; score: number | null };

const TIMEPOINTS: Timepoint[] = ["baseline", "month3", "year1"];

export async function PromsCard({ journeyId }: { journeyId: string }) {
  const t = await getT();
  const supabase = await createClient();
  // Separate, tolerant query so the patient card still works before patch-proms.sql is applied.
  const { data } = await supabase.from("proms_responses").select("instrument, timepoint, score").eq("journey_id", journeyId);
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;

  const instruments = [...new Set(rows.map((r) => r.instrument))];
  const byKey = new Map(rows.map((r) => [`${r.instrument}:${r.timepoint}`, r.score]));

  return (
    <section aria-label={t("שאלוני בריאות")}>
      <h2 className="eyebrow mb-1">{t("שאלוני בריאות (PROMs)")}</h2>
      <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-start text-muted">
            <th className="px-3 py-2 text-start font-medium">{t("שאלון")}</th>
            {TIMEPOINTS.map((tp) => <th key={tp} className="px-3 py-2 text-start font-medium">{t(TIMEPOINT_LABEL[tp])}</th>)}
          </tr>
        </thead>
        <tbody>
          {instruments.map((inst) => (
            <tr key={inst} className="border-b border-line last:border-0">
              <td className="px-3 py-2 font-medium">{t(instrumentTitle(inst))}</td>
              {TIMEPOINTS.map((tp) => (
                <td key={tp} className="num px-3 py-2">{scoreLabel(inst, byKey.get(`${inst}:${tp}`) ?? null)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}
