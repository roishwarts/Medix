import { NextResponse } from "next/server";

// Always re-run on the server (never cached), so a poller always gets the version
// actually running right now, even right after a fresh deploy.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ version: process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev" });
}
