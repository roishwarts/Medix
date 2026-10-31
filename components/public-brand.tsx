import { BrandTheme } from "@/components/brand-theme";
import { getPublicBrand } from "@/lib/brand-public";

// Colors for the pages seen before signing in; with `logo`, also the clinic's logo and name above the card.
// A clinic with a deep brand color gets a full-page backdrop in it, like the hero of its own website.
export async function PublicBrand({ logo = false }: { logo?: boolean }) {
  const brand = await getPublicBrand();
  if (!brand) return null;
  const dark = !!brand.brand.dark;
  return (
    <>
      <BrandTheme brand={brand.brand} />
      {dark && <style>{`body{background:var(--public-bg)!important}.public-link{color:#fff!important}main .card{background:var(--color-surface)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}`}</style>}
      {logo && (
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className={`brand-logo h-14 w-auto max-w-full object-contain sm:h-16 ${dark ? "rounded-2xl bg-white px-4 py-2" : ""}`} />
          ) : (
            <p className={`display text-2xl ${dark ? "text-white" : ""}`}>{brand.name}</p>
          )}
        </div>
      )}
    </>
  );
}
