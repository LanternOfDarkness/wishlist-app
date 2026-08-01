import type { CSSProperties } from "react";

interface WishlistBannerProps {
  /** `resolvedAppearance.banner.visible` — page-only mode hides the banner. */
  visible: boolean;
  /** `resolvedAppearance.banner.style` — background color/image. */
  style: CSSProperties;
  /** Height classes only, since the two surfaces size the banner differently
   *  (e.g. `"h-48 md:h-64"` on the profile page, `"h-28"` in the embed). */
  heightClassName: string;
}

/** The banner strip shared by the profile page and the embed widget. */
export function WishlistBanner({
  visible,
  style,
  heightClassName,
}: WishlistBannerProps) {
  if (!visible) {
    return null;
  }

  // No elevation — the banner sits flush on the paper (§1 depth rule): just
  // the image/color strip with a bottom ink border, no shadow.
  return (
    <div
      className={`relative w-full border-b ${heightClassName}`}
      style={style}
    >
      <div className="absolute inset-0 bg-black/10" />
    </div>
  );
}
