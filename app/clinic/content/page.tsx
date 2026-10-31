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

  const sections = [
    { id: "logo", label: t("מיתוג") },
    { id: "contact", label: t("הצוות שלי") },
    { id: "general-info", label: t("מידע כללי לניתוח") },
    { id: "red-flags", label: t("דגלים אדומים") },
    { id: "links", label: t("קישורים") },
    { id: "videos", label: t("סרטוני הדרכה") },
  ];

  return (
    <main className="max-w-3xl pb-6">
      <p className="eyebrow">{t("מטופלים")}</p>
      <h1 className="display mt-1 text-4xl">{t("תוכן למטופלים")}</h1>
      <p className="mt-2 max-w-prose text-muted">
        {t("מידע, קישורים וסרטונים שמופיעים בעמוד המסלול של המטופלים. שינוי כאן משפיע מיד על כל מטופלי המרפאה.")}
      </p>

      {/* Quick jump: six cards on one long scroll is normal for a settings page, but a short anchor list
          lets someone who came here for one thing (e.g. the emergency number) skip straight to it. */}
      <nav aria-label={t("קפיצה למדור")} className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="btn btn-quiet btn-sm shrink-0">{s.label}</a>
        ))}
      </nav>

      <div className="mt-5 space-y-5">
        <div id="logo" className="scroll-mt-4 md:scroll-mt-20">
          <LogoForm clinicId={profile.clinic_id} logoUrl={profile.logo_url} brandColor={profile.brand_color} />
        </div>
        <div id="contact" className="scroll-mt-4 md:scroll-mt-20">
          <ContactForm
            initial={{
              contact_name: profile.contact_name,
              contact_role: profile.contact_role,
              contact_phone: profile.contact_phone,
              emergency_phone: profile.emergency_phone,
              office_hours: profile.office_hours,
              address: profile.clinic_address,
            }}
          />
        </div>
        <div id="general-info" className="scroll-mt-4 md:scroll-mt-20">
          <GeneralInfoForm templates={templates ?? []} />
        </div>
        <div id="red-flags" className="scroll-mt-4 md:scroll-mt-20">
          <RedFlagsForm templates={templates ?? []} />
        </div>
        <div id="links" className="scroll-mt-4 md:scroll-mt-20">
          <LinksForm links={links} />
        </div>
        <div id="videos" className="scroll-mt-4 md:scroll-mt-20">
          <VideosForm clinicId={profile.clinic_id} videos={videos} />
        </div>
      </div>
    </main>
  );
}
