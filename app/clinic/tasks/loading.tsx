// Shown the moment this page is opened, mirroring the filter header and the grouped two-column
// task lists so the layout doesn't jump once data lands.
import { Tr } from "@/components/i18n-provider";

export default function Loading() {
  return (
    <div className="animate-pulse space-y-10" aria-busy="true" role="status">
      <span className="sr-only"><Tr k="טוען" /></span>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-9 w-28 rounded-xl bg-paper" />
        <div className="h-9 w-56 rounded-xl bg-paper" />
      </div>
      <div className="grid gap-x-8 gap-y-8 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-32 rounded-full bg-paper" />
            <div className="h-28 rounded-2xl bg-paper" />
          </div>
        ))}
      </div>
    </div>
  );
}
