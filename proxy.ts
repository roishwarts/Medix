import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const UID_HEADER = "x-medix-uid";
export const AAL_HEADER = "x-medix-aal";

const VIEW_ONLY_MESSAGE = "אתה במצב צפייה כמנהל, ולכן אי אפשר לערוך פרטים.";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;
  const isLogin = request.nextUrl.pathname.startsWith("/login");
  const path = request.nextUrl.pathname;
  const isPublic = isLogin || path.startsWith("/invite/") || path.startsWith("/join/") || path.startsWith("/reset/") || path.startsWith("/forgot");

  // "View as" can be made read-only (set VIEW_AS_READ_ONLY=1 in Vercel, e.g. once real patients are using the system).
  // By default the admin can do everything the user can, to test the system from their side.
  if (process.env.VIEW_AS_READ_ONLY === "1" && signedIn && request.method === "POST" && !isLogin) {
    const raw = request.cookies.get("medix_view_as")?.value;
    try {
      const body = raw?.split(".")[0];
      const target = body ? JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/"))).target : null;
      if (target && target === data?.claims?.sub) {
        // Answer in the format a server action expects, so the page shows a message instead of an error page:
        // the action "returns" { error }, and the header tells the client to open the explanation popup.
        const flight = `0:{"a":"$@1"}\n1:${JSON.stringify({ error: VIEW_ONLY_MESSAGE })}\n`;
        return new NextResponse(flight, { status: 200, headers: { "content-type": "text/x-component", "x-view-as-blocked": "1" } });
      }
    } catch {
      // A malformed cookie is simply ignored.
    }
  }

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // `error` is set when a signed-in user has no profile; don't bounce them back, or we loop forever.
  if (signedIn && isLogin && !request.nextUrl.searchParams.has("error")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // The session was verified once, here. Pass the result to the page so it does not verify it again
  // (that is a network round trip on every request for projects that still use the shared JWT secret).
  // Any value sent by the browser is discarded first, so these headers can only come from this function.
  const forwarded = new Headers(request.headers);
  forwarded.delete(UID_HEADER);
  forwarded.delete(AAL_HEADER);
  forwarded.set("x-medix-path", request.nextUrl.pathname);
  if (signedIn && data?.claims?.sub) {
    forwarded.set(UID_HEADER, data.claims.sub);
    forwarded.set(AAL_HEADER, String((data.claims as { aal?: string }).aal ?? "aal1"));
  }
  const next = NextResponse.next({ request: { headers: forwarded } });
  response.cookies.getAll().forEach((c) => next.cookies.set(c));
  return next;
}

export const config = {
  // The icons, share image and manifest must load without signing in (home screen, WhatsApp previews).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|opengraph-image.png|twitter-image.png|manifest.webmanifest|icon-192.png|icon-512.png).*)"],
};
