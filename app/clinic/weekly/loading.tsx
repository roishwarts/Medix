// Shown the moment the weekly summary opens, mirroring its single stat card plus the surgeries
// list so the Sunday-morning glance doesn't jump once data lands.
export default function Loading() {
  return (
    <div className="max-w-2xl animate-pulse space-y-8 pb-6" aria-busy="true" role="status">
      <span className="sr-only">טוען</span>
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-full bg-paper" />
        <div className="h-9 w-56 rounded-xl bg-paper" />
        <div className="h-4 w-72 max-w-full rounded-full bg-paper" />
      </div>
      <div className="h-40 rounded-2xl bg-paper" />
      <div className="space-y-3">
        <div className="h-5 w-32 rounded-full bg-paper" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-paper" />
        ))}
      </div>
    </div>
  );
}
