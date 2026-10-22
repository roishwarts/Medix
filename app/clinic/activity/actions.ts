"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

// Opening the updates page counts everything so far as seen, for this person only.
export async function markActivitySeen() {
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  await supabase.from("activity_seen").upsert({ user_id: profile.id, seen_at: new Date().toISOString() });
  revalidatePath("/clinic", "layout");
}
