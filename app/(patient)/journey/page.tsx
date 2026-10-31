import { HomeSettingsButton } from "@/components/home-settings";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadJourneys } from "@/lib/queries";
import { nowTask, ownerLabel, type Task } from "@/lib/journey";
import { formatDate, formatDateLong, relativeDays, today } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import type { T } from "@/lib/i18n";
import type { Lang } from "@/lib/prefs";
import { Icon, ReadinessBar } from "@/components/ui";
import { NavigateButtons } from "@/components/navigate-buttons";
import { resolvePlace } from "@/lib/location";
import { getClinicLinks, getClinicVideos, signClinicVideos } from "@/lib/clinic-content";
import { whatsAppUrl } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [profile, [journey], links, videos] = await Promise.all([
    requireProfile(["patient", "caregiver"]),
    loadJourneys(),
    getClinicLinks(),
    getClinicVideos(),
  ]);
  if (!journey) {
    return <p className="py-20 text-center text-muted">{t("עדיין לא הוגדר עבורך מסלול. פנה/י למרפאה.")}</p>;
  }
  const videoUrls = await signClinicVideos(videos);
  const { summary } = journey;
  const surgeryPassed = summary.daysToSurgery < 0;
  const t0 = today();

  const preop = summary.tasks.filter((t) => t.preop);
  const postop = summary.tasks.filter((t) => !t.preop);

  const now = nowTask(summary.tasks);
  const waiting = summary.tasks.filter((t) => t.owner === "patient" && t.state === "review");
  const nextAppt = surgeryPassed ? undefined : summary.tasks.find((t) => t.kind === "appointment" && t.state !== "done" && t.eventDate >= t0);

  const preopDone = preop.filter((t) => t.state === "done").length;
  // Collapse a long run of finished steps at the start of the journey.
  let leading = 0;
  while (leading < preop.length && preop[leading].state === "done") leading++;
  const folded = leading >= 3 ? preop.slice(0, leading) : [];
  const visiblePreop = preop.slice(folded.length);

  const heading = surgeryPassed ? t("הניתוח הושלם") : summary.daysToSurgery === 0 ? t("הניתוח היום") : t("הניתוח {when}", { when: relativeDays(journey.surgery_date, t0, lang).toLowerCase() });

  return (
    <main className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-16">
      <div className="min-w-0 lg:sticky lg:top-24 lg:col-span-2">
        <p className="mb-1 text-muted">{t("שלום {name}", { name: profile.full_name })}</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="display text-3xl">{heading}</h1>
          <HomeSettingsButton home="/journey" />
        </div>
        <p className="mt-1 text-muted">{formatDateLong(journey.surgery_date, lang)}</p>
        {surgeryPassed && <p className="mt-3 text-muted">{t("מאחלים החלמה מהירה ושלמה.")}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/calendar/ics" className="btn btn-sm">{t("הוספה ליומן")}</a>
          {profile.role === "patient" && (
            <>
              <Link href="/family" className="btn btn-sm">{t("שיתוף עם בן משפחה")}</Link>
              <Link href="/onboarding" className="btn btn-quiet btn-sm">{t("איך זה עובד")}</Link>
            </>
          )}
        </div>

        {!surgeryPassed && (
          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="font-medium">{t("מוכנות לניתוח")}</span>
              <span className="num text-lg font-medium">{summary.readiness}%</span>
            </div>
            <ReadinessBar value={summary.readiness} state={summary.readinessState} />
            <p className="mt-2 text-sm text-muted">
              {t("הושלמו {done} מתוך {total} שלבים", { done: preopDone, total: preop.length })}
            </p>
          </div>
        )}

        {/* NOW */}
        {!surgeryPassed && (
          <section className="mt-8" aria-labelledby="now-title">
            {now ? (
              <Link href={`/journey/tasks/${now.id}`} className="card block border-accent-line p-5 transition hover:border-accent">
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
                  <p className="text-sm font-medium text-muted">{t("התור הקרוב")}</p>
                  <p className="mt-0.5 break-words font-medium">{nextAppt.title}</p>
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
            <p className="text-sm font-medium text-muted">{t("הצוות שלי")}</p>
            {(profile.contact_name || profile.contact_role) && (
              <p className="mt-1 break-words font-medium">
                {profile.contact_name}
                {profile.contact_name && profile.contact_role && " · "}
                {profile.contact_role}
              </p>
            )}
            {profile.contact_phone && (
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${profile.contact_phone.replace(/[^\d+]/g, "")}`} className="btn btn-sm">{t("חיוג")}</a>
                <a href={whatsAppUrl(profile.contact_phone, `שלום, אני ${profile.full_name}`)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                  WhatsApp
                </a>
              </div>
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
                <span>{t("מידע נוסף ועזרים")}</span>
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

      {/* TIMELINE */}
      <section className="mt-10 min-w-0 lg:col-span-3 lg:mt-0" aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="mb-4 text-sm font-medium text-muted">{t("המסע שלך")}</h2>
        <ol>
          {folded.length > 0 && (
            <li className="relative pb-7 ps-11">
              <span className="absolute start-0 top-0 grid size-7 place-items-center rounded-full bg-ok text-white" aria-hidden="true"><Icon name="check" size={14} /></span>
              <span className="absolute start-[13px] top-8 bottom-0 w-px bg-line" aria-hidden="true" />
              <details className="group">
                <summary className="flex min-h-7 cursor-pointer list-none flex-wrap items-center gap-x-2 font-medium text-muted [&::-webkit-details-marker]:hidden">
                  <span>{t("{n} שלבים הושלמו", { n: folded.length })}</span>
                  <span className="text-sm text-accent group-open:hidden">{t("הצגה")}</span>
                  <span className="hidden text-sm text-accent group-open:inline">{t("הסתרה")}</span>
                </summary>
                <ol className="mt-3 space-y-2 border-s border-line ps-4">
                  {folded.map((t) => (
                    <li key={t.id}>
                      <Link href={`/journey/tasks/${t.id}`} className="flex min-h-11 items-center gap-2 break-words text-muted">
                        <Icon name="check" size={14} /> {t.title}
                      </Link>
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          )}
          {visiblePreop.map((tk) => (
            <TimelineItem key={tk.id} task={tk} isNow={tk.id === now?.id} last={false} t={t} lang={lang} />
          ))}
          <li className="relative pb-8 ps-11">
            <span className="absolute start-0 top-0 grid size-7 place-items-center rounded-full bg-accent text-surface" aria-hidden="true">
              <span className="size-2 rounded-full bg-surface" />
            </span>
            {postop.length > 0 && <span className="absolute start-[13px] top-7 bottom-0 w-px bg-line" aria-hidden="true" />}
            <p className="display text-lg">{t("יום הניתוח")}</p>
            <p className="text-sm text-muted">{formatDateLong(journey.surgery_date, lang)}</p>
          </li>
          {postop.map((tk, i) => (
            <TimelineItem key={tk.id} task={tk} isNow={tk.id === now?.id} last={i === postop.length - 1} t={t} lang={lang} />
          ))}
        </ol>
      </section>
    </main>
  );
}

function TimelineItem({ task, isNow, last, t, lang }: { task: Task; isNow: boolean; last: boolean; t: T; lang: Lang }) {
  const { state, overdue } = task;
  let node: React.ReactNode;
  if (state === "done") {
    node = <span className="grid size-7 place-items-center rounded-full bg-ok text-white"><Icon name="check" size={14} /></span>;
  } else if (isNow) {
    node = <span className={`grid size-7 place-items-center rounded-full border-2 ${overdue ? "border-bad" : "border-accent"} bg-surface`}><span className={`size-2.5 rounded-full ${overdue ? "bg-bad" : "bg-accent"}`} /></span>;
  } else if (state === "review") {
    node = <span className="grid size-7 place-items-center rounded-full border-2 border-warn bg-warn-soft text-warn"><Icon name="clock" size={14} /></span>;
  } else if (state === "locked") {
    node = <span className="grid size-7 place-items-center rounded-full border border-dashed border-line-strong bg-paper text-muted"><Icon name="lock" size={12} /></span>;
  } else if (overdue || state === "rejected") {
    node = <span className="grid size-7 place-items-center rounded-full border-2 border-bad bg-bad-soft text-bad"><Icon name="alert" size={14} /></span>;
  } else {
    node = <span className="block size-7 rounded-full border-2 border-line-strong bg-surface" />;
  }

  const when = (iso: string) => formatDate(iso, lang);
  const sub =
    state === "done" ? t("הושלם")
    : state === "review" ? t("ממתין לבדיקת הצוות")
    : state === "locked" ? t("ייפתח אחרי: {list}", { list: task.blockedBy.map((b) => b.title).join(", ") })
    : state === "rejected" ? t("הוחזר לתיקון")
    : task.kind === "appointment" ? `${overdue ? t("באיחור") + " · " : ""}${when(task.eventDate)}${task.eventTime ? ` · ${task.eventTime}` : ""}${task.location ? ` · ${task.location}` : ""}`
    : overdue ? t("באיחור · היה עד {date}", { date: when(task.dueDate) })
    : t("עד {date}", { date: when(task.dueDate) });

  return (
    <li className="relative pb-5 ps-11" aria-current={isNow ? "step" : undefined}>
      <span className="absolute start-0 top-0" aria-hidden="true">{node}</span>
      {!last && <span className="absolute start-[13px] top-8 bottom-0 w-px bg-line" aria-hidden="true" />}
      <Link href={`/journey/tasks/${task.id}`} className="block min-h-11 break-words">
        <p className={`font-medium leading-snug ${state === "done" || state === "locked" ? "text-muted" : ""}`}>
          {task.title}
        </p>
        <p className={`mt-0.5 text-sm ${overdue || state === "rejected" ? "text-bad" : "text-muted"}`}>
          {sub}
          {task.owner !== "patient" && state !== "done" && ` · ${ownerLabel(task.owner, t)}`}
        </p>
      </Link>
    </li>
  );
}
