import { cache } from "react";
import { createAdminClient } from "./supabase/admin";

export type PublicBrand = { name: string; logoUrl: string | null; color: string | null };

// On an install with exactly one clinic (or the one named in BRAND_CLINIC_NAME), the pages seen before signing in (login, links in messages) and the
// browser tab / home screen name carry that clinic's identity. With several clinics nothing is assumed.
export const getPublicBrand = cache(async (): Promise<PublicBrand | null> => {
  const db = createAdminClient();
  if (!db) return null;
  // With several clinics on one install, BRAND_CLINIC_NAME (a server setting) says which one these pages belong to.
  const wanted = process.env.BRAND_CLINIC_NAME?.trim();
  let q = db.from("clinics").select("name, logo_path, brand_color").limit(2);
  if (wanted) q = q.eq("name", wanted);
  const { data, error } = await q;
  if (error || !data || data.length !== 1) return null;
  const c = data[0] as { name: string; logo_path?: string | null; brand_color?: string | null };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const logoUrl = c.logo_path ? (/^https:\/\//.test(c.logo_path) ? c.logo_path : base ? `${base}/storage/v1/object/public/clinic-logos/${c.logo_path}` : null) : null;
  const color = c.brand_color && /^#[0-9a-fA-F]{6}$/.test(c.brand_color) ? c.brand_color : null;
  return { name: c.name, logoUrl, color };
});
