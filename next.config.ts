import type { NextConfig } from "next";

// The version shown in the admin badge: the short commit id of this deploy (Vercel sets it), or "dev" locally.
const version = process.env.NEXT_PUBLIC_BUILD_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_VERSION: version },
  experimental: {
    // Pages that were prefetched or visited stay usable for a short while, so switching tabs does not wait for the server.
    // Saving anything clears this cache, so a change you make is always shown right away.
    staleTimes: { dynamic: 30, static: 30 },
  },
};

export default nextConfig;
