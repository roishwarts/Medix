// Applies the clinic's brand color on top of the design system's default accent. `:root` always
// targets the single <html> element no matter where this <style> tag sits in the tree, so this can
// be mounted inside the clinic/patient layouts without touching the root layout (which also serves
// the login and admin pages, neither of which should carry any one clinic's branding).
// The soft/line tints are derived from the brand color at render time via color-mix(), so they stay
// correct in both light and dark mode without the clinic having to pick four colors instead of one.
export function BrandTheme({ color }: { color: string | null }) {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return null;
  return (
    <style>{`:root{--color-accent:${color};--color-accent-soft:color-mix(in srgb, ${color} 12%, var(--color-surface));--color-accent-line:color-mix(in srgb, ${color} 35%, var(--color-surface));}`}</style>
  );
}
