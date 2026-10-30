import type { NextConfig } from "next";

import { execSync } from "node:child_process";

// The version shown in the admin badge: how many commits the branch has, so every commit raises it by one.
// Build servers often clone only the latest commits, so the full history is fetched first. If git is not
// available the short commit id is shown instead ("dev" locally without git).
function buildVersion(): string {
  if (process.env.NEXT_PUBLIC_BUILD_VERSION) return process.env.NEXT_PUBLIC_BUILD_VERSION;
  const git = (cmd: string) => execSync(`git ${cmd}`, { stdio: ["ignore", "pipe", "ignore"], timeout: 60_000 }).toString().trim();
  try {
    if (git("rev-parse --is-shallow-repository") === "true") {
      try { git("fetch --unshallow --quiet"); } catch { /* no access to the remote: use what is there */ }
    }
    const n = Number(git("rev-list --count HEAD"));
    if (git("rev-parse --is-shallow-repository") !== "true" && Number.isInteger(n) && n > 0) return String(n);
  } catch { /* not a git checkout */ }
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";
}
const version = buildVersion();

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_VERSION: version },
  experimental: {
    // Pages that were prefetched or visited stay usable for a short while, so switching tabs does not wait for the server.
    // Saving anything clears this cache, so a change you make is always shown right away.
    staleTimes: { dynamic: 30, static: 30 },
  },
};

export default nextConfig;
