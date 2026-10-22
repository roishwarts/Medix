import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

// How many updates from other people arrived since this person last opened the updates page.
export async function ActivityBadge() {
  const profile = await getProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { data: seen } = await supabase.from("activity_seen").select("seen_at").eq("user_id", profile.id).maybeSingle();

  let q = supabase
    .from("activity_events")
    .select("id", { count: "exact", head: true })
    .or(`actor_id.is.null,actor_id.neq.${profile.id}`);
  if (seen?.seen_at) q = q.gt("created_at", seen.seen_at);
  const { count } = await q;
  if (!count) return null;

  return (
    <span className="num ms-1.5 inline-grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-medium leading-5 text-white" aria-label={`${count} עדכונים חדשים`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
