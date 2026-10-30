import { requireProfile } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getClinicLinks, getClinicVideos } from "@/lib/clinic-content";
import { GeneralInfoForm } from "./general-info-form";
import { LinksForm } from "./links-form";
import { VideosForm } from "./videos-form";

export const dynamic = "force-dynamic";

export default async function ClinicContentPage() {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();

  const [{ data: templates }, links, videos] = await Promise.all([
    supabase.from("templates").select("id, name, patient_info").order("name"),
    getClinicLinks(),
    getClinicVideos(),
  ]);

  return (
    <main className="max-w-3xl pb-6">
      <p className="eyebrow">{t("מטופלים")}</p>
      <h1 className="display mt-1 text-4xl">{t("תוכן למטופלים")}</h1>
      <p className="mt-2 max-w-prose text-muted">
        {t("מידע, קישורים וסרטונים שמופיעים בעמוד המסלול של המטופלים. שינוי כאן משפיע מיד על כל מטופלי המרפאה.")}
      </p>

      <div className="mt-6 space-y-5">
        <GeneralInfoForm templates={templates ?? []} />
        <LinksForm links={links} />
        <VideosForm clinicId={profile.clinic_id} videos={videos} />
      </div>
    </main>
  );
}
