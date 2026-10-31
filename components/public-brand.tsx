import { BrandTheme } from "@/components/brand-theme";
import { getPublicBrand } from "@/lib/brand-public";

// Colors for the pages seen before signing in; with `logo`, also the clinic's logo and name above the card.
export async function PublicBrand({ logo = false }: { logo?: boolean }) {
  const brand = await getPublicBrand();
  if (!brand) return null;
  return (
    <>
      <BrandTheme color={brand.color} />
      {logo && (
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className="brand-logo h-14 w-auto max-w-full object-contain sm:h-16" />
          ) : (
            <p className="display text-2xl">{brand.name}</p>
          )}
        </div>
      )}
    </>
  );
}
