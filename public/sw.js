// Medix offline shell. Scope: make the app usable (view the last-loaded page, and queue a couple
// of safe actions) through a few minutes-to-hours of dropped connectivity — not a full offline
// data layer. Never touches anything but plain same-origin GETs: Supabase calls, Server Action
// POSTs and API routes always go straight to the network, untouched, so mutations never get
// silently served from cache.
const SHELL_CACHE = "medix-shell-v1";
const PAGE_CACHE = "medix-pages-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== PAGE_CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Built JS/CSS/fonts: content-hashed and immutable, so cache-first is always correct.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Page navigations: always prefer a live copy; fall back to the last one seen when the network
  // request fails outright (not just a slow/error response — only a real connectivity failure).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(PAGE_CACHE).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(PAGE_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          return new Response(
            "<!doctype html><meta charset=utf-8><body style='font-family:sans-serif;padding:2rem;text-align:center'><p>אין חיבור לאינטרנט, ועדיין אין עותק שמור של הדף הזה.</p></body>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }),
    );
  }
});
