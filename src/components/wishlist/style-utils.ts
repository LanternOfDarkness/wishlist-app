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
