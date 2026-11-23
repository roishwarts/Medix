import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Signing out. A route (not a server action) on purpose: proxy.ts blocks every write while a "view as" session is
// active, and signing out must always work, also when the "view as" cookie has gone stale and the person is stuck in
// the viewed account. Clears the session and the "view as" cookie, then goes to the login page.
// It never waits long for the sign-in service: if that is slow, the cookies are cleared here anyway, so the person is
// signed out on this browser at once (the session just is not revoked on the server).
export async function POST(request: Request) {
  const supabase = await createClient();
  await Promise.race([
    supabase.auth.signOut().catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  const jar = await cookies();
  jar.delete("medix_view_as");
  for (const c of jar.getAll()) if (c.name.startsWith("sb-")) jar.delete(c.name);
  // 303: the browser follows a POST with a GET of the login page.
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
