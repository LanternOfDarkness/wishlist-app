import { Gift } from "lucide-react";
import Image from "next/image";

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
}

/**
 * The per-item `item.imageUrl && isSafeUrl(item.imageUrl) ? <Image /> : <Gift
 * fallback>` block shared by the profile page's item cards and the embed's
 * item tiles.
 */
export function WishlistItemImage({
  imageUrl,
  alt,
  sizes,
  className = "",
  imageClassName = "",
  fallbackIconClassName = "w-12 h-12",
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
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <Gift className={fallbackIconClassName} />
        </div>
      )}
    </div>
  );
}
