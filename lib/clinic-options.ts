import { cache } from "react";
import { createClient } from "./supabase/server";

export type ClinicOptions = { hospitals: string[]; companies: string[] };

// The signed-in clinic's hospital and company lists (empty if the options patch has not been applied).
export const getClinicOptions = cache(async (): Promise<ClinicOptions> => {
  const supabase = await createClient();
  const { data } = await supabase.from("clinic_options").select("kind, name").order("name");
  const rows = data ?? [];
  return {
    hospitals: rows.filter((r) => r.kind === "hospital").map((r) => r.name as string),
    companies: rows.filter((r) => r.kind === "company").map((r) => r.name as string),
  };
});
