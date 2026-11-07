import type { NextConfig } from "next";

import { execSync } from "node:child_process";

// The version shown in the admin badge: how many commits the branch has, so every commit raises it by one.
// Locally this is read from git. Build servers clone only the latest commits, so there the number is asked from
// GitHub (the commit list of the deployed commit; GITHUB_TOKEN is optional and only avoids rate limits).
// If none of these work, the short commit id is shown instead ("dev" locally without git).
function buildVersion(): string {
  if (process.env.NEXT_PUBLIC_BUILD_VERSION) return process.env.NEXT_PUBLIC_BUILD_VERSION;
  const run = (cmd: string, ms = 30_000) => execSync(cmd, { stdio: ["ignore", "pipe", "ignore"], timeout: ms }).toString().trim();
  const count = () => {
    const n = Number(run("git rev-list --count HEAD"));
    return Number.isInteger(n) && n > 0 ? String(n) : null;
  };
  // 1) A full checkout (local, or any build server that cloned everything).
  try {
    if (run("git rev-parse --is-shallow-repository") !== "true") {
      const n = count();
      if (n) return n;
    } else {
      // 2) A shallow clone (Vercel clones only the latest commits): fetch the rest of the history when the
      //    clone's credentials allow it, then count.
      try {
        run("git fetch --unshallow --quiet", 90_000);
        const n = count();
        if (n) return n;
      } catch { /* the clone cannot fetch more history */ }
    }
  } catch { /* not a git checkout */ }
  // 3) Ask GitHub for the number of commits behind the deployed commit. A private repository needs GITHUB_TOKEN
  //    (a read-only token set in the Vercel project's environment variables).
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.VERCEL_GIT_REPO_SLUG;
  if (sha && owner && repo) {
    try {
      const auth = process.env.GITHUB_TOKEN ? `-H "Authorization: Bearer ${process.env.GITHUB_TOKEN}"` : "";
      const headers = run(`curl -sSI -m 20 ${auth} -H "Accept: application/vnd.github+json" "https://api.github.com/repos/${owner}/${repo}/commits?sha=${sha}&per_page=1"`);
      const last = /<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/i.exec(headers);
      if (last) return last[1];
      if (/^HTTP\/\S+ 200/.test(headers)) return "1"; // a single page: one commit
    } catch { /* offline or rate-limited */ }
  }
  // 4) Last resort: the short commit id ("dev" locally without git).
  return sha?.slice(0, 7) ?? "dev";
}
const version = buildVersion();

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_VERSION: version },
  experimental: {
    // Pages that were prefetched or visited stay usable for a short while, so switching tabs does not wait for the server.
    // Saving anything clears this cache, so a change you make is always shown right away.
    staleTimes: { dynamic: 60, static: 60 },
  },
};

export default nextConfig;
