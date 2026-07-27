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

  return (
    <p className={className} style={{ color: primaryColor || "var(--primary)" }}>
      {price.toFixed(2)} {currency}
    </p>
  );
}
