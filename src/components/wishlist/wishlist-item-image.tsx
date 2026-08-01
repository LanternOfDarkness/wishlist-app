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
    <div
      className={`relative aspect-square overflow-hidden bg-muted${
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
          className={`h-full w-full object-cover${
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
  );
}
