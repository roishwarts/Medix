import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Signing out. A route (not a server action) on purpose: proxy.ts blocks every write while a "view as" session is
// active, and signing out must always work, also when the "view as" cookie has gone stale and the person is stuck in
// the viewed account. Clears the session and the "view as" cookie, then goes to the login page.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete("medix_view_as");
  // 303: the browser follows a POST with a GET of the login page.
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
