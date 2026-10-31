// Applies the clinic's brand color on top of the design system's default accent. `:root` always
// targets the single <html> element no matter where this <style> tag sits in the tree, so this can
// be mounted inside the clinic/patient layouts without touching the root layout.
// The soft/line tints are derived from the brand color at render time via color-mix(), so they stay
// correct in both light and dark mode without the clinic having to pick four colors instead of one.
// In dark mode the brand color is lightened so it stays readable, and the page gets a faint wash of the color.
export function BrandTheme({ color }: { color: string | null }) {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return null;
  const light = `--color-accent:${color};--color-accent-soft:color-mix(in srgb, ${color} 10%, var(--color-surface));--color-accent-line:color-mix(in srgb, ${color} 32%, var(--color-surface));--color-page:color-mix(in srgb, ${color} 4%, #faf9f5);--topbar-bg:color-mix(in srgb, ${color} 4%, rgb(250 249 245 / 0.8));`;
  const dark = `--color-accent:color-mix(in srgb, ${color} 62%, white);--color-accent-soft:color-mix(in srgb, ${color} 22%, var(--color-surface));--color-accent-line:color-mix(in srgb, ${color} 45%, var(--color-surface));--color-page:color-mix(in srgb, ${color} 6%, #131417);`;
  return (
    <style>{`:root{${light}}html[data-theme="dark"]{${dark}}@media (prefers-color-scheme: dark){html[data-theme="system"]{${dark}}}`}</style>
  );
}
