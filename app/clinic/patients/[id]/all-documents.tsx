import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { formatDate, israelParts } from "@/lib/dates";
import { Icon } from "@/components/ui";

export type DocItem = { id: string; title: string; fileName: string; url: string | undefined; date: string | null };

export async function AllDocuments({ items }: { items: DocItem[] }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  if (items.length === 0) return null;
  return (
    <details className="card group mt-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        <span>{t("כל המסמכים")} <span className="num text-muted">({items.length})</span></span>
        <span className="text-sm text-accent">
          <span className="group-open:hidden">{t("הצגה")}</span>
          <span className="hidden group-open:inline">{t("הסתרה")}</span>
        </span>
      </summary>
      <ul className="divide-y divide-line border-t border-line">
        {items.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <Icon name="file" size={16} />
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium">{d.title}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-2 break-words text-xs text-muted">
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{d.fileName}</a>
                ) : (
                  <span>{d.fileName}</span>
                )}
                {d.date && <span>· {formatDate(israelParts(d.date).date, lang)}</span>}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
