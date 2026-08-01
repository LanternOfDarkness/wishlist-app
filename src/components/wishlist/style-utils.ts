import type { AppearanceTokens } from "@/lib/wishlist-appearance";

/**
 * Appends an alpha suffix to a primary color for use as a CSS `borderColor`
 * value (e.g. `"#112233"` + `"30"` -> `"#11223330"`).
 *
 * Guards against a falsy `primaryColor` — without this, `${primaryColor}30`
 * would interpolate into the literal (invalid) CSS string `"undefined30"`
 * instead of leaving the border color unset. Both wishlist surfaces share
 * this helper so that guard can't drift out of sync again the way it did
 * before (one page guarded it, the other didn't).
 */
export function borderColorWithAlpha(
  primaryColor: string | null | undefined,
  alphaSuffix: string,
): string | undefined {
  return primaryColor ? `${primaryColor}${alphaSuffix}` : undefined;
}

/**
 * Computes the sketch double-stroke frame color fed into `--sk-line-override`
 * (see `.sketch` / `.sketch::after` in globals.css). Per the two-axis rule
 * (structure is brand-fixed, color always follows the viewer's own resolved
 * appearance), this must never fall back to a `--sk-*` brand hex — it reads
 * the per-wishlist `foreground` token, the strongest ink-like color in the
 * resolved palette, and reuses the existing `borderColorWithAlpha` helper to
 * soften it rather than inventing a new color-mixing routine. `border` is
 * the fallback for the (practically unreachable, since `foreground` is a
 * required `AppearanceTokens` field) case where `borderColorWithAlpha`
 * returns `undefined`.
 */
export function sketchFrameColor(
  tokens: Pick<AppearanceTokens, "border" | "foreground">,
): string {
  return borderColorWithAlpha(tokens.foreground, "cc") ?? tokens.border;
}
