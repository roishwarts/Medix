import { logout } from "@/app/login/actions";
import { getImpersonation } from "@/lib/impersonation";

// Server-only (it reads the session cookie), so it lives apart from the shared UI pieces that client components import.
export async function LogoutButton() {
  if (await getImpersonation()) return <a href="/impersonate/exit" className="btn btn-quiet btn-sm">חזרה לניהול</a>;
  return (
    <form action={logout}>
      <button className="btn btn-quiet btn-sm">יציאה</button>
    </form>
  );
}
