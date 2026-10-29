import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // "View as" mode is read-only: every write (a POST, i.e. a server action) is refused.
  if (signedIn && request.method === "POST" && !isLogin) {
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
  return response;
}

export const config = {
  // The icons, share image and manifest must load without signing in (home screen, WhatsApp previews).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|opengraph-image.png|twitter-image.png|manifest.webmanifest|icon-192.png|icon-512.png).*)"],
};
