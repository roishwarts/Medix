import { JourneyTimeline } from "./timeline";
import { HomeSettingsButton } from "@/components/home-settings";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadJourneys } from "@/lib/queries";
import { nowTask, pickActiveJourney } from "@/lib/journey";
import { formatDate, formatDateLong, relativeDays, today } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { Icon, ReadinessBar } from "@/components/ui";
import { NavigateButtons } from "@/components/navigate-buttons";
import { resolvePlace } from "@/lib/location";
import { getClinicLinks, getClinicVideos, signClinicVideos } from "@/lib/clinic-content";

export const dynamic = "force-dynamic";

export default async function JourneyPage({ searchParams }: { searchParams: Promise<{ j?: string }> }) {
  const [t, lang, profile, journeys, links, videos, sp] = await Promise.all([
    getT(),
    getLang(),
    requireProfile(["patient", "caregiver"]),
    loadJourneys(),
    getClinicLinks(),
    getClinicVideos(),
    searchParams,
  ]);
  if (journeys.length === 0) {
    return <p className="py-20 text-center text-muted">{t("עדיין לא הוגדר עבורך מסלול. פנה/י למרפאה.")}</p>;
  }
  // A patient can have more than one journey (another surgery, past or planned). ?j= picks a
  // specific one (from the "other journeys" switcher below); otherwise the active one shows by default.
  const journey = (sp.j && journeys.find((j) => j.id === sp.j)) || pickActiveJourney(journeys)!;
  const otherJourneys = journeys.filter((j) => j.id !== journey.id);
  const videoUrls = await signClinicVideos(videos);
  const { summary } = journey;
  const surgeryPassed = summary.daysToSurgery < 0;
  const t0 = today();

  const preop = summary.tasks.filter((t) => t.preop);

  const now = nowTask(summary.tasks);
  const waiting = summary.tasks.filter((t) => t.owner === "patient" && t.state === "review");
  // Tasks are sorted by dueDate, which can drift from the real appointment date once an appointment
  // is rescheduled (scheduled_at overrides eventDate but not the sort key) — so pick the soonest
  // upcoming appointment by eventDate, not just the first match in dueDate order.
  const nextAppt = surgeryPassed
    ? undefined
    : summary.tasks
        .filter((t) => t.kind === "appointment" && t.state !== "done" && t.eventDate >= t0)
        .sort((a, b) => (a.eventDate < b.eventDate ? -1 : a.eventDate > b.eventDate ? 1 : 0))[0];

  const preopDone = preop.filter((t) => t.state === "done").length;
  const heading = surgeryPassed ? t("הניתוח הושלם") : summary.daysToSurgery === 0 ? t("הניתוח היום") : t("הניתוח {when}", { when: relativeDays(journey.surgery_date, t0, lang).toLowerCase() });

  return (
    <main className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-16">
      <div className="min-w-0 lg:sticky lg:top-24 lg:col-span-2">
        <div>
        <p className="mb-1 text-muted">{t("שלום {name}", { name: profile.full_name })}</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="display text-3xl">{heading}</h1>
          <HomeSettingsButton home="/journey" />
        </div>
        <p className="mt-1.5 text-lg font-medium text-accent">{formatDateLong(journey.surgery_date, lang)}</p>
        {surgeryPassed && <p className="mt-3 text-muted">{t("מאחלים החלמה מהירה ושלמה.")}</p>}
        </div>

        {otherJourneys.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted">{t("מסלולים נוספים:")}</span>
            {otherJourneys.map((j) => (
              <Link key={j.id} href={`/journey?j=${j.id}`} className="font-medium text-accent hover:underline">
                {j.procedure || j.template_name} · {formatDate(j.surgery_date, lang)}
              </Link>
            ))}
          </div>
        )}

        {!surgeryPassed && (() => {
          const readiness = (
            <>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="font-medium">{t("מוכנות לניתוח")}</span>
                <span className="num text-lg font-medium">{summary.readiness}%</span>
              </div>
              <ReadinessBar value={summary.readiness} state={summary.readinessState} />
              <p className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{t("הושלמו {done} מתוך {total} שלבים", { done: preopDone, total: preop.length })}</span>
                <span className="font-medium text-accent lg:hidden">{t("המסע שלך: לכל השלבים")} ›</span>
              </p>
            </>
          );
          return (
            <div className="mt-6">
              {/* On a phone the whole block opens the journey; on a wide screen the journey is already beside it. */}
              <Link href={journey.id === pickActiveJourney(journeys)!.id ? "/journey/steps" : `/journey/steps?j=${journey.id}`} className="block min-h-11 lg:hidden">{readiness}</Link>
              <div className="hidden lg:block">{readiness}</div>
            </div>
          );
        })()}

        {/* NOW */}
        {!surgeryPassed && (
          <section className="mt-8" aria-labelledby="now-title">
            {now ? (
              <Link href={`/journey/tasks/${now.id}`} className="card block border-accent-line p-5 transition hover:border-accent" style={{ background: "linear-gradient(180deg, var(--color-accent-soft), var(--color-surface))" }}>
                <p className="text-sm font-medium text-accent">{t("הצעד הבא שלך")}</p>
                <h2 id="now-title" className="display mt-1 break-words text-2xl">{now.title}</h2>
                {now.state === "rejected" && now.review_note && (
                  <p className="mt-3 break-words rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{t("הצוות החזיר לתיקון: {note}", { note: now.review_note })}</p>
                )}
                {now.description && <p className="mt-2 line-clamp-4 break-words text-muted">{now.description}</p>}
                <p className={`mt-4 text-sm ${now.overdue ? "font-medium text-bad" : "text-muted"}`}>
                  {now.overdue ? t("היה צריך להסתיים ב־{date}", { date: formatDate(now.dueDate, lang) }) : t("עד {date}", { date: formatDate(now.dueDate, lang) })} · {relativeDays(now.dueDate, t0, lang)}
                </p>
                <span className="btn btn-primary mt-3 w-full sm:w-auto">
                  {now.state === "rejected" ? t("לתיקון") : now.requires_evidence ? t("העלאת מסמך") : t("להמשך")} <Icon name="arrow" />
                </span>
              </Link>
            ) : (
              <div className="card p-5">
                <p className="text-sm font-medium text-muted">{t("הצעד הבא שלך")}</p>
                <h2 id="now-title" className="display mt-1 text-2xl">
                  {waiting.length > 0 ? t("הכול אצל הצוות") : summary.readiness === 100 ? t("הכול מוכן") : t("אין כרגע משימה פתוחה")}
                </h2>
                <p className="mt-2 text-muted">
                  {waiting.length > 0
                    ? waiting.length === 1 ? t("שלחת משימה אחת לבדיקה. נעדכן אותך ברגע שהצוות יאשר.") : t("שלחת {n} משימות לבדיקה. נעדכן אותך ברגע שהצוות יאשר.", { n: waiting.length })
                    : summary.readiness === 100
                      ? t("סיימת את כל ההכנות. נתראה ביום הניתוח.")
                      : t("הצוות עובד על השלבים הבאים. נעדכן כשיהיה משהו לעשות.")}
                </p>
              </div>
            )}
          </section>
        )}

        {/* NEXT APPOINTMENT */}
        {nextAppt && (() => {
          const place = resolvePlace(nextAppt.location, profile.clinic_address);
          return (
            <div className="card mt-4 p-4">
              <Link href={`/journey/tasks/${nextAppt.id}`} className="flex min-h-16 items-center justify-between gap-4 rounded-xl">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-muted"><Chip>{CAL_ICON}</Chip>{t("התור הקרוב")}</p>
                  <p className="mt-1 break-words font-medium">{nextAppt.title}</p>
                  <p className="break-words text-sm text-muted">
                    {formatDateLong(nextAppt.eventDate, lang)}
                    {nextAppt.eventTime && <> · <span className="num">{nextAppt.eventTime}</span></>}
                    {place.place && <> · {t(place.place)}</>}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-accent">{relativeDays(nextAppt.eventDate, t0, lang)}</span>
              </Link>
              {place.address && <p className="mt-1 break-words text-sm">{place.address}</p>}
              {place.navQuery && <NavigateButtons query={place.navQuery} className="mt-3" />}
            </div>
          );
        })()}

        {/* CARE TEAM */}
        {(profile.contact_name || profile.contact_phone || profile.emergency_phone) && (
          <div className="card mt-4 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-muted"><Chip>{TEAM_ICON}</Chip>{t("הצוות שלי")}</p>
            {(profile.contact_name || profile.contact_role) && (
              <p className="mt-1 break-words font-medium">
                {profile.contact_name}
                {profile.contact_name && profile.contact_role && " · "}
                {profile.contact_role}
              </p>
            )}
            {profile.contact_phone && (
              <a href={`tel:${profile.contact_phone.replace(/[^\d+]/g, "")}`} className="btn mt-3 w-full">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
                {t("חיוג למרפאה")}
              </a>
            )}
            {profile.office_hours && <p className="mt-2 text-sm text-muted">{t("שעות מענה")}: {profile.office_hours}</p>}
            {profile.emergency_phone && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-bad-soft px-3 py-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-bad">
                  <Icon name="alert" size={14} /> {t("למקרה חירום")}
                </span>
                <a href={`tel:${profile.emergency_phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="num font-medium text-bad hover:underline">
                  {profile.emergency_phone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* RED FLAGS */}
        {journey.red_flags && (
          <div className="mt-4 rounded-2xl bg-bad-soft p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-bad">
              <Icon name="alert" size={14} /> {t("מתי להתקשר דחוף")}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-bad">{journey.red_flags}</p>
          </div>
        )}

        {/* MORE INFO: general info, videos and links are reference material, not today's action — tucked behind a disclosure so the page doesn't read as a wall of cards. */}
        {(() => {
          const relevantVideos = videos.filter((v) => (surgeryPassed ? v.phase === "after" : true) && videoUrls[v.id]);
          if (!journey.patient_info && relevantVideos.length === 0 && links.length === 0) return null;
          return (
            <details className="card group mt-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2"><Chip>{INFO_ICON}</Chip>{t("מידע נוסף ועזרים")}</span>
                <span className="text-sm text-accent">
                  <span className="group-open:hidden">{t("הצגה")}</span>
                  <span className="hidden group-open:inline">{t("הסתרה")}</span>
                </span>
              </summary>
              <div className="space-y-4 border-t border-line px-4 pb-4 pt-4">
                {journey.patient_info && (
                  <div>
                    <p className="text-sm font-medium text-muted">{t("מידע כללי לניתוח")}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words">{journey.patient_info}</p>
                  </div>
                )}

                {relevantVideos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted">{t("סרטוני הדרכה")}</p>
                    <ul className="mt-2 space-y-3">
                      {relevantVideos.map((v) => (
                        <li key={v.id}>
                          <p className="mb-1 break-words text-sm font-medium">{v.title}</p>
                          <video controls preload="none" className="w-full rounded-xl" src={videoUrls[v.id]} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {links.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted">{t("קישורים שימושיים")}</p>
                    <ul className="mt-2 space-y-1">
                      {links.map((l) => (
                        <li key={l.id}>
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 font-medium text-accent hover:underline">
                            {l.label} <Icon name="arrow" size={12} />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          );
        })()}
      </div>

      {/* TIMELINE: next to the cards on a wide screen; on a phone it has its own screen (see /journey/steps) */}
      <JourneyTimeline journey={journey} t={t} lang={lang} className="mt-10 hidden min-w-0 lg:col-span-3 lg:mt-0 lg:block" />
    </main>
  );
}

// A small tinted icon in front of a card's label.
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-grid size-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </span>
  );
}
const CAL_ICON = <><rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M4 10h16M9 3.5v4M15 3.5v4" /></>;
const TEAM_ICON = <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5M16 5.5a3 3 0 0 1 0 5.6M18 14.5c2 .6 3 2.2 3 4.5" /></>;
const INFO_ICON = <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>;
