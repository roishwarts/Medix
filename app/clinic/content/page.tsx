import { requireProfile } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getClinicLinks, getClinicVideos } from "@/lib/clinic-content";
import { ContactForm } from "./contact-form";
import { LogoForm } from "./logo-form";
import { GeneralInfoForm } from "./general-info-form";
import { RedFlagsForm } from "./red-flags-form";
import { LinksForm } from "./links-form";
import { VideosForm } from "./videos-form";

export const dynamic = "force-dynamic";

export default async function ClinicContentPage() {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();

  // red_flags (patch-red-flags.sql) may not exist yet: fall back to a select without it.
  type TemplateRow = { id: string; name: string; patient_info: string | null; red_flags: string | null };
  let templates: TemplateRow[] = [];
  const full = await supabase.from("templates").select("id, name, patient_info, red_flags").order("name");
  if (!full.error) {
    templates = full.data ?? [];
  } else {
    const fallback = await supabase.from("templates").select("id, name, patient_info").order("name");
    templates = (fallback.data ?? []).map((row) => ({ ...row, red_flags: null }));
  }

  const [links, videos] = await Promise.all([getClinicLinks(), getClinicVideos()]);

  return (
    <main className="max-w-3xl pb-6">
      <p className="eyebrow">{t("מטופלים")}</p>
      <h1 className="display mt-1 text-4xl">{t("תוכן למטופלים")}</h1>
      <p className="mt-2 max-w-prose text-muted">
        {t("מידע, קישורים וסרטונים שמופיעים בעמוד המסלול של המטופלים. שינוי כאן משפיע מיד על כל מטופלי המרפאה.")}
      </p>

      <div className="mt-6 space-y-5">
        <LogoForm clinicId={profile.clinic_id} logoUrl={profile.logo_url} brandColor={profile.brand_color} />
        <ContactForm
          initial={{
            contact_name: profile.contact_name,
            contact_role: profile.contact_role,
            contact_phone: profile.contact_phone,
            emergency_phone: profile.emergency_phone,
            office_hours: profile.office_hours,
          }}
        />
        <GeneralInfoForm templates={templates ?? []} />
        <RedFlagsForm templates={templates ?? []} />
        <LinksForm links={links} />
        <VideosForm clinicId={profile.clinic_id} videos={videos} />
      </div>
    </main>
  );
}
