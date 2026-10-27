import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getImpersonation, IMP_COOKIE } from "@/lib/impersonation";

// Ends "view as" and signs the admin back in, without a password.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const imp = await getImpersonation();
  const jar = await cookies();
  if (!imp) {
    jar.delete(IMP_COOKIE);
    return NextResponse.redirect(`${origin}/`);
  }
  const db = createAdminClient();
  if (!db) return NextResponse.redirect(`${origin}/login`);

  const { data: isAdmin } = await db.from("platform_admins").select("user_id").eq("user_id", imp.admin).maybeSingle();
  const { data: adminUser } = await db.auth.admin.getUserById(imp.admin);
  const email = adminUser.user?.email;
  if (!isAdmin || !email) {
    jar.delete(IMP_COOKIE);
    return NextResponse.redirect(`${origin}/login`);
  }
  const { data: link } = await db.auth.admin.generateLink({ type: "magiclink", email });
  const hash = link?.properties?.hashed_token;
  jar.delete(IMP_COOKIE);
  if (!hash) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: hash, type: "magiclink" });
  if (error) return NextResponse.redirect(`${origin}/login`);
  await db.from("admin_audit").insert({ admin_id: imp.admin, target_user_id: imp.target, action: "view_as_end" });
  return NextResponse.redirect(`${origin}/admin/users`);
}
