import type { CSSProperties } from "react";

interface WishlistItemPriceProps {
  price: number | null | undefined;
  currency: string;
  primaryColor?: string | null;
  /** Sizing classes — the profile page renders a larger price line than the
   *  embed's compact tiles. */
  className: string;
}

/**
 * The item price line shared by the profile page and the embed widget.
 *
 * Styled as a "circled-pencil badge" (design concept §4) — a hand-drawn
 * ring around the number, set in `font-display` — rather than plain text.
 * `primaryColor` is already the caller's resolved per-wishlist token, so
 * this only restyles the container/font around it; the ring color follows
 * that same prop, never a hardcoded `--sk-highlight` brand hex, per the
 * two-axis rule (structure is brand-fixed, color follows the viewer's own
 * theme on wishlist surfaces).
 *
 * Uses a null-check (`price != null`), not a truthy check: an item priced
 * exactly `0` is a real, explicit price and should render, the same way the
 * embed already treated it before this extraction. The profile page used to
 * check truthiness instead, which hid the price line for a `0`-priced item —
 * sharing this component is what stops that drifting apart again.
 */
export function WishlistItemPrice({
  price,
  currency,
  primaryColor,
  className,
}: WishlistItemPriceProps) {
  if (price == null) {
    return null;
  }

  const color = primaryColor || "var(--primary)";

  return (
    <p
      className={`inline-flex w-fit -rotate-1 items-center rounded-full border-[1.6px] px-3 py-0.5 font-display leading-tight ${className}`}
      style={{ color, borderColor: color } as CSSProperties}
    >
      {price.toFixed(2)} {currency}
    </p>
  );
}
