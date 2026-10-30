import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadJourneys } from "@/lib/queries";
import { getCaregiverLink, getProfile } from "@/lib/auth";
import { ownerLabel } from "@/lib/journey";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { formatDateLong, relativeDays } from "@/lib/dates";
import { Icon, TaskStatePill } from "@/components/ui";
import { SubmitPanel } from "./submit-panel";
import { NavigateButtons } from "@/components/navigate-buttons";
import { resolvePlace } from "@/lib/location";

export const dynamic = "force-dynamic";

type Tone = "neutral" | "ok" | "warn" | "bad";

const TONE: Record<Tone, { box: string; icon: string }> = {
  neutral: { box: "border-dashed border-line-strong bg-surface/50", icon: "text-muted" },
  ok: { box: "border-ok/25 bg-ok-soft", icon: "text-ok" },
  warn: { box: "border-warn/25 bg-warn-soft", icon: "text-warn" },
  bad: { box: "border-bad/25 bg-bad-soft", icon: "text-bad" },
};

// Text stays dark ink on the soft backgrounds so contrast holds; the tone lives in the border and icon.
function Notice({ tone, icon, title, children }: { tone: Tone; icon: "check" | "lock" | "clock" | "alert" | "file"; title: string; children?: React.ReactNode }) {
  const c = TONE[tone];
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 ${c.box}`}>
      <span className={`mt-0.5 shrink-0 ${c.icon}`}><Icon name={icon} size={20} /></span>
      <div className="min-w-0">
        <h2 className="font-medium">{title}</h2>
        {children && <div className="mt-1 space-y-1 break-words text-sm text-ink/80">{children}</div>}
      </div>
    </div>
  );
}

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [[journey], profile] = await Promise.all([loadJourneys(), getProfile()]);
  const task = journey?.summary.tasks.find((x) => x.id === id);
  if (!journey || !task) notFound();

  // The uploaded file's link and the caregiver's permissions do not depend on each other.
  const [fileUrl, caregiver] = await Promise.all([
    task.evidence_path
      ? createClient().then((supabase) => supabase.storage.from("evidence").createSignedUrl(task.evidence_path!, 600)).then(({ data }) => data?.signedUrl ?? null)
      : Promise.resolve<string | null>(null),
    profile?.role === "caregiver" ? getCaregiverLink() : Promise.resolve(null),
  ]);
  const mayAct = profile?.role === "patient" || !!caregiver?.can_act;
  const mine = task.owner === "patient";
  const canSubmit = mayAct && mine && (task.state === "todo" || task.state === "rejected");
  const isAppt = task.kind === "appointment";
  const place = resolvePlace(task.location, profile?.clinic_address);
  const viewOnly = !!profile && profile.role === "caregiver" && !mayAct;
  const selfOwned = profile?.role === "patient" && mine;
  const ownerText = selfOwned ? t("באחריותך") : t("באחריות {owner}", { owner: ownerLabel(task.owner, t) });
  const open = task.state === "todo" || task.state === "rejected";
  const needsFile = task.requires_evidence;

  const required = isAppt
    ? t("הגעה למרפאה")
    : task.requires_evidence
      ? t("העלאת מסמך")
      : task.requires_review
        ? t("אישור הצוות")
        : mine
          ? t("סימון שבוצע")
          : t("טיפול {owner}", { owner: ownerLabel(task.owner, t) });

  return (
    <main className={`mx-auto pb-8 ${canSubmit ? "max-w-xl lg:grid lg:max-w-none lg:grid-cols-5 lg:items-start lg:gap-16" : "max-w-xl"}`}>
      <div className={canSubmit ? "lg:col-span-3" : undefined}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <TaskStatePill state={task.state} overdue={task.overdue} />
          <span className="text-sm text-muted">{ownerText}</span>
        </div>
        <h1 className="display mt-3 break-words text-3xl">{task.title}</h1>
        {task.description && <p className="mt-3 whitespace-pre-line break-words text-lg text-muted">{task.description}</p>}

        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl border border-line bg-surface/60 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="eyebrow">{isAppt ? t("מועד התור") : t("מועד יעד")}</dt>
            <dd className="mt-1 font-medium">
              {formatDateLong(task.eventDate, lang)}
              {task.eventTime && <>, {t("בשעה")} <span className="num" dir="ltr">{task.eventTime}</span></>}
              {task.state !== "done" && (
                <span className={`block font-normal ${task.overdue ? "text-bad" : "text-muted"}`}>{relativeDays(task.eventDate, undefined, lang)}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">{t("נדרש")}</dt>
            <dd className="mt-1 font-medium">{required}</dd>
          </div>
          {isAppt && (place.place || place.address) && (
            <div className="sm:col-span-2">
              <dt className="eyebrow">{t("מיקום")}</dt>
              <dd className="mt-1 break-words font-medium">
                {t(place.place)}
                {place.address && <span className="block font-normal text-muted">{place.address}</span>}
              </dd>
              {place.navQuery && task.state !== "done" && <NavigateButtons query={place.navQuery} className="mt-3" />}
            </div>
          )}
        </dl>

        <div className="mt-6 space-y-3">
          {task.state === "locked" && (
            <Notice tone="neutral" icon="lock" title={t("המשימה עדיין נעולה")}>
              <p>{t("היא תיפתח אחרי שיושלם: {list}.", { list: task.blockedBy.map((b) => b.title).join(", ") })}</p>
            </Notice>
          )}

          {task.state === "rejected" && (
            <Notice tone="bad" icon="alert" title={t("הצוות ביקש תיקון")}>
              {task.review_note ? <p className="whitespace-pre-line">{task.review_note}</p> : <p>{t("הצוות לא הוסיף הערה.")}</p>}
              {canSubmit && <p>{t("אפשר לצרף קובץ מתוקן ולשלוח שוב.")}</p>}
            </Notice>
          )}

          {task.state === "review" && (
            <Notice tone="warn" icon="clock" title={t("נשלח וממתין לבדיקת הצוות")}>
              <p>{t("אין צורך לעשות דבר כרגע. נעדכן כשהצוות יסיים.")}</p>
              {task.patient_note && <p className="whitespace-pre-line">{t("ההערה ששלחת: {note}", { note: task.patient_note })}</p>}
            </Notice>
          )}

          {task.state === "done" && (
            <Notice tone="ok" icon="check" title={isAppt ? t("התור הושלם") : t("המשימה אושרה")}>
              {task.patient_note && <p className="whitespace-pre-line">{t("ההערה ששלחת: {note}", { note: task.patient_note })}</p>}
            </Notice>
          )}

          {open && isAppt && (
            <Notice tone="neutral" icon="clock" title={t("אין צורך להעלות דבר")}>
              <p>{t("מספיק להגיע למרפאה בזמן")}{place.place ? ` (${t(place.place)})` : ""}.</p>
            </Notice>
          )}

          {open && !isAppt && !mine && (
            <Notice tone="neutral" icon="clock" title={t(task.owner === "doctor" ? t("הרופא מטפל בשלב הזה") : t("הצוות מטפל בשלב הזה"))}>
              <p>{t("אין צורך בפעולה מצדך. השלב יסומן כשיושלם.")}</p>
            </Notice>
          )}

          {open && !isAppt && mine && viewOnly && (
            <Notice tone="neutral" icon="lock" title={t("מצב צפייה בלבד")}>
              <p>
                {caregiver?.patient_name ? t("רק {name} יכול/ה לשלוח את המשימה.", { name: caregiver.patient_name }) : t("אין לך הרשאה לשלוח משימות.")}{" "}
                {t("אפשר להזכיר לו/ה.")}
              </p>
            </Notice>
          )}

          {fileUrl && (
            <div>
              <p className="eyebrow mb-1.5">{t("הקובץ ששלחת")}</p>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="btn h-auto w-full justify-start gap-2 whitespace-normal py-2.5 text-start sm:w-auto">
                <span className="shrink-0"><Icon name="file" /></span>
                <span className="min-w-0 break-all" dir="auto">{task.evidence_name ?? t("פתיחת הקובץ")}</span>
                <span className="sr-only">({t("נפתח בלשונית חדשה")})</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {canSubmit && (
        <aside className="mt-8 lg:col-span-2 lg:mt-0 lg:pt-14" aria-label={t("שליחת המשימה")}>
          <SubmitPanel
            taskId={task.id}
            journeyId={journey.id}
            requiresEvidence={needsFile}
            needsReview={task.requires_review || task.requires_evidence}
            resubmit={task.state === "rejected"}
          />
        </aside>
      )}
    </main>
  );
}
