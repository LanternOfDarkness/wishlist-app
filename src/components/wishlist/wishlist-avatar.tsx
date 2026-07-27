import Image from "next/image";
import type { ReactNode } from "react";

import { isSafeUrl } from "@/lib/utils";

interface WishlistAvatarProps {
  image?: string | null;
  alt: string;
  /** Pixel size used for the `next/image` `sizes` hint (e.g. 128, 96). */
  sizePx: number;
  /** Size/spacing classes, since the two surfaces render the avatar at
   *  different dimensions (`"w-32 h-32 mb-2"` vs `"h-24 w-24"`). */
  className: string;
  /** Rendered when there is no safe `image` URL (e.g. `<UserIcon />` on the
   *  profile page, `<Gift />` in the embed). */
  fallback: ReactNode;
}

/**
 * The `user.image && isSafeUrl(user.image) ? <Image /> : <fallback>` block
 * shared by the profile page and the embed widget. Centralizing the
 * `isSafeUrl` guard here is what makes it reachable by a unit test at all —
 * previously it only existed inline in page JSX.
 */
export function WishlistAvatar({
  image,
  alt,
  sizePx,
  className,
  fallback,
}: WishlistAvatarProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-full border-4 border-background bg-background shadow-md ${className}`}
    >
      {image && isSafeUrl(image) ? (
        <Image
          src={image}
          alt={alt}
          fill
          sizes={`${sizePx}px`}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {fallback}
        </div>
      )}
    </div>
  );
}
