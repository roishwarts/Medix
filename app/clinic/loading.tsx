// Shown the moment the dashboard opens, mirroring its layout (KPI tiles, then the two-column
// surgeries/attention + readiness/updates sections) so the page doesn't jump around once data lands.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" role="status">
      <span className="sr-only">טוען</span>
      <div className="flex items-center justify-between gap-3">
        <div className="h-9 w-40 rounded-xl bg-paper" />
        <div className="h-9 w-28 rounded-xl bg-paper" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-paper" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-paper" />
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-paper" />
          ))}
        </div>
        <div className="space-y-3 lg:col-span-2">
          <div className="h-28 rounded-2xl bg-paper" />
          <div className="h-16 rounded-2xl bg-paper" />
          <div className="h-16 rounded-2xl bg-paper" />
        </div>
      </div>
    </div>
  );
}
