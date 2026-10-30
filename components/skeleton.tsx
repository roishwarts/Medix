import { Tr } from "@/components/i18n-provider";

// Shown immediately while a page loads, so a click always gets an instant response.
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse" aria-busy="true" role="status">
      <span className="sr-only"><Tr k="טוען" /></span>
      <div className="h-3 w-24 rounded-full bg-paper" />
      <div className="mt-3 h-9 w-56 rounded-xl bg-paper" />
      <div className="mt-2 h-4 w-72 max-w-full rounded-full bg-paper" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-14 rounded-2xl bg-paper" />
        ))}
      </div>
    </div>
  );
}
