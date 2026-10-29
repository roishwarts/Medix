import { googleMapsUrl, wazeUrl } from "@/lib/location";

// Opens the user's navigation app. Plain links, so they work on phones without any script.
export function NavigateButtons({ query, className = "" }: { query: string; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a href={wazeUrl(query)} target="_blank" rel="noreferrer" className="btn btn-sm">ניווט ב-Waze</a>
      <a href={googleMapsUrl(query)} target="_blank" rel="noreferrer" className="btn btn-sm">ניווט ב-Google Maps</a>
    </div>
  );
}
