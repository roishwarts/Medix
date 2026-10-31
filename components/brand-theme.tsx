import type { Brand } from "@/lib/brand";

// Applies a clinic's colors on top of the design system's defaults. `:root` always targets the single <html>
// element wherever this <style> tag sits, so it can be mounted inside the clinic/patient layouts.
//  - color: the accent (links, highlights, the selected dot). Tints are derived with color-mix(), so they stay right
//    in light and dark mode.
//  - dark: the deep color of the top bar, the bottom bar and the hero on the patient's first screen.
//  - gold: the highlight (primary buttons, the selected tab).
// With only `color` the app keeps its light look and just changes its accent.
export function BrandTheme({ brand }: { brand: Brand }) {
  const { color, dark, gold } = brand;
  if (!color && !dark && !gold) return null;
  let css = "";
  if (color) {
    const light = `--color-accent:${color};--color-accent-soft:color-mix(in srgb, ${color} 10%, var(--color-surface));--color-accent-line:color-mix(in srgb, ${color} 32%, var(--color-surface));--color-page:color-mix(in srgb, ${color} 3%, #faf9f5);`;
    const night = `--color-accent:color-mix(in srgb, ${color} 62%, white);--color-accent-soft:color-mix(in srgb, ${color} 22%, var(--color-surface));--color-accent-line:color-mix(in srgb, ${color} 45%, var(--color-surface));--color-page:color-mix(in srgb, ${color} 6%, #131417);`;
    css += `:root{${light}}html[data-theme="dark"]{${night}}@media (prefers-color-scheme: dark){html[data-theme="system"]{${night}}}`;
  }
  if (dark) {
    const g = gold ?? "#ffffff";
    css += `:root{--tb-bg:${dark};--tb-fg:#ffffff;--tb-muted:rgb(255 255 255 / 0.74);--tb-line:${g};--tb-hover:rgb(255 255 255 / 0.1);--bar-bg:${dark};--hero-bg:linear-gradient(135deg, ${dark}, color-mix(in srgb, ${dark} 78%, white));--hero-fg:#ffffff;--hero-muted:rgb(255 255 255 / 0.78);--hero-accent:${g};--hero-pad:1.25rem 1.25rem 1.4rem;--public-bg:linear-gradient(160deg, ${dark}, color-mix(in srgb, ${dark} 80%, white));--tb-bw:3px;--hero-shadow:0 18px 40px -22px rgb(0 0 0 / 0.5);}.topbar .brand-logo{background:#fff;border-radius:0.6rem;padding:0.15rem 0.5rem}`;
  }
  if (gold) {
    css += `:root{--tab-on-bg:${gold};--tab-on-fg:${dark ?? "#1b2430"};--btn-p-a:color-mix(in srgb, ${gold} 82%, white);--btn-p-b:${gold};--btn-p-border:color-mix(in srgb, ${gold} 75%, black);--btn-p-fg:${dark ?? "#1b2430"};--bar-on:${gold};--tab-on-border:transparent;--tab-on-shadow:none;}`;
  }
  return <style>{css}</style>;
}
