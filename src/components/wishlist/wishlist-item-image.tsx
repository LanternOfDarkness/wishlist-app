import { Gift } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";

import { isSafeUrl } from "@/lib/utils";

interface WishlistItemImageProps {
  imageUrl?: string | null;
  alt: string;
  /** `next/image` `sizes` hint — the two surfaces use different responsive
   *  breakpoints (a viewport-relative string on the profile page, a fixed
   *  widget pixel size in the embed). */
  sizes: string;
  /** Extra classes appended to the wrapper (e.g. embed's item-border class). */
  className?: string;
  /** Extra classes appended to the image itself (e.g. profile's hover-zoom). */
  imageClassName?: string;
  /** Defaults to the profile page's larger fallback icon; the embed passes
   *  a smaller one for its compact tiles. */
  fallbackIconClassName?: string;
  /** Hatch-stroke color for the no-image placeholder, fed from the resolved
   *  wishlist appearance's `tokens.mutedForeground` — per the two-axis rule
   *  this is always the viewer's own theme color, never a `--sk-*` brand
   *  hex. Omit to fall back to the plain `bg-muted` fill (e.g. call sites
   *  that don't have a resolved appearance to hand). */
  hatchColor?: string;
}

/**
 * The per-item `item.imageUrl && isSafeUrl(item.imageUrl) ? <Image /> : <Gift
 * fallback>` block shared by the profile page's item cards and the embed's
 * item tiles. When there's no image, the fallback is a `.sketch-hatch`
 * diagonal-line placeholder (a sketch standing in for a photo not yet taken)
 * with the `Gift` glyph centered on top of it — the hatch is decorative, not
 * a replacement for the icon, so it's a separate `aria-hidden` layer and the
 * `<Image>` `alt` contract is unchanged.
 *
 * Wrapped in an inset `p-2` frame rather than sitting flush against the
 * card edge: the outer `.sketch` card uses its own asymmetric, wobbly
 * border-radius that doesn't line up with this box's (uniform, user-chosen)
 * `itemBorderClass` radius, so a flush image visibly overshot the card's
 * rounded corners. The inset also reads as a photo pasted onto the page
 * rather than a bleed-to-edge stock photo, which fits the hand-drawn frame
 * better. The `border` utility has no explicit color, so it inherits
 * `var(--border)` from the `* { border-color }` base rule — already the
 * viewer's own resolved token on this page, never a brand `--sk-*` hex.
 *
 * `object-contain`, not `object-cover`: item photos are scraped from
 * arbitrary product pages via URL/OG-image metadata, so their aspect ratio
 * is unpredictable — a wide product shot (e.g. an M.2 stick photographed
 * lengthwise) `object-cover`'d into this square just center-crops to a thin
 * band of mostly blank label background, cropping off the actual
 * identifying content. `object-contain` always shows the whole photo,
 * letterboxed against the wrapper's own `bg-muted` in the gaps.
 */
export function WishlistItemImage({
  imageUrl,
  alt,
  sizes,
  className = "",
  imageClassName = "",
  fallbackIconClassName = "w-12 h-12",
  hatchColor,
}: WishlistItemImageProps) {
  return (
    <div className="w-full p-2">
      <div
        className={`relative aspect-square overflow-hidden border bg-muted${
          className ? ` ${className}` : ""
        }`}
      >
        {imageUrl && isSafeUrl(imageUrl) ? (
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes={sizes}
            unoptimized
            className={`h-full w-full object-contain${
              imageClassName ? ` ${imageClassName}` : ""
            }`}
          />
        ) : (
          <div className="relative flex h-full items-center justify-center text-muted-foreground">
            <div
              aria-hidden="true"
              className="sketch-hatch absolute inset-0"
              style={
                hatchColor
                  ? ({ "--sk-hatch-override": hatchColor } as CSSProperties)
                  : undefined
              }
            />
            <Gift className={`relative ${fallbackIconClassName}`} />
          </div>
        )}
      </div>
    </div>
  );
}
