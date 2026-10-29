import type { MetadataRoute } from "next";

// What a phone shows when the app is added to the home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "הכנה לניתוח",
    short_name: "הכנה לניתוח",
    description: "כל שלבי ההכנה, המסמכים והתורים במקום אחד.",
    start_url: "/",
    display: "standalone",
    lang: "he",
    dir: "rtl",
    background_color: "#faf9f5",
    theme_color: "#4b6584",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
