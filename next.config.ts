import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Pages that were prefetched or visited stay usable for a short while, so switching tabs does not wait for the server.
    // Saving anything clears this cache, so a change you make is always shown right away.
    staleTimes: { dynamic: 20, static: 20 },
  },
};

export default nextConfig;
