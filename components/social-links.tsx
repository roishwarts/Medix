import { getT } from "@/lib/i18n/server";

const ICONS = {
  facebook: <path d="M14 8.5V7c0-.8.2-1.3 1.4-1.3H17V3.1c-.3 0-1.2-.1-2.3-.1-2.3 0-3.7 1.4-3.7 3.9v1.6H8.5v3H11V21h3v-9.5h2.4l.4-3z" fill="currentColor" stroke="none" />,
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" /></>,
  youtube: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="currentColor" stroke="none" /><path d="m10 9.2 5 2.8-5 2.8z" fill="var(--bar-bg, #2e3440)" stroke="none" /></>,
} as const;

// The clinic's social pages: round dark buttons with gold icons (the clinic's own bar colours when set).
export async function SocialLinks({ facebook, instagram, youtube, className = "" }: { facebook: string | null; instagram: string | null; youtube: string | null; className?: string }) {
  const t = await getT();
  const links = ([
    ["facebook", facebook, t("פייסבוק")],
    ["instagram", instagram, t("אינסטגרם")],
    ["youtube", youtube, t("יוטיוב")],
  ] as const).filter((l): l is readonly [keyof typeof ICONS, string, string] => !!l[1]);
  if (links.length === 0) return null;
  return (
    <nav aria-label={t("הרשתות החברתיות של המרפאה")} className={className}>
      <ul className="flex items-center justify-center gap-3">
        {links.map(([k, href, label]) => (
          <li key={k}>
            <a
              href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
              className="grid size-14 place-items-center rounded-full border border-white/10 bg-[var(--bar-bg,#2e3440)] text-[var(--bar-on,#f7a801)] shadow-sm transition hover:brightness-110"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[k]}</svg>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
