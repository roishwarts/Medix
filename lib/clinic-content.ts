import { createClient } from "./supabase/server";

export type ClinicLink = { id: string; label: string; url: string; position: number };
export type ClinicVideo = { id: string; title: string; phase: "before" | "after"; storage_path: string; position: number };

export async function getClinicLinks(): Promise<ClinicLink[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clinic_links").select("id, label, url, position").order("position");
  return data ?? [];
}

export async function getClinicVideos(): Promise<ClinicVideo[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clinic_videos").select("id, title, phase, storage_path, position").order("position");
  return (data ?? []) as ClinicVideo[];
}

// Signed, time-limited playback URLs for a set of videos (the bucket is private).
export async function signClinicVideos(videos: ClinicVideo[]): Promise<Record<string, string>> {
  if (videos.length === 0) return {};
  const supabase = await createClient();
  const entries = await Promise.all(
    videos.map(async (v) => {
      const { data } = await supabase.storage.from("clinic-videos").createSignedUrl(v.storage_path, 3600);
      return [v.id, data?.signedUrl] as const;
    }),
  );
  return Object.fromEntries(entries.filter((e): e is [string, string] => !!e[1]));
}
