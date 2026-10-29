import { getImpersonation } from "@/lib/impersonation";
import { ViewAsGuard } from "./view-as-guard";

const ROLE: Record<string, string> = { doctor: "רופא", staff: "צוות", patient: "מטופל", caregiver: "בן משפחה" };

// A floating bar, shown on every screen while the admin is viewing the system as another user.
export async function ImpersonationBanner() {
  const imp = await getImpersonation();
  if (!imp) return null;
  return (
    <>
    <ViewAsGuard />
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div role="status" className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-black/15 bg-white/90 py-1.5 ps-5 pe-1.5 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.3)] backdrop-blur">
        <p className="min-w-0 truncate text-sm">
          צפייה כ־<span className="font-medium">{imp.name}</span> <span className="text-muted">({ROLE[imp.role] ?? imp.role}) · קריאה בלבד</span>
        </p>
        <a href="/impersonate/exit" className="btn btn-primary btn-sm shrink-0">חזרה לניהול</a>
      </div>
    </div>
    </>
  );
}
