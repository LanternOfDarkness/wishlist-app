import localFont from "next/font/local";

/**
 * Self-hosted brand fonts for the "sketch" hand-drawn identity.
 *
 * Two hand-lettered faces are used sitewide, each paired with a
 * Cyrillic-capable companion so Ukrainian (`uk` locale) copy renders in a
 * matching handwritten style instead of falling back to a system font.
 * Neither "Architects Daughter" nor "Patrick Hand" ships Cyrillic glyphs, so
 * the companion covers that range and the browser falls through per-glyph
 * (see `--font-display` / `--font-hand` in globals.css for the stacks that
 * combine these).
 *
 * These are brand tokens only — never bound to `--font-sans` / `--font-mono`,
 * which remain the user-selectable wishlist fonts (see FONT_OPTIONS in
 * wishlist-appearance.ts).
 */

export const architectsDaughter = localFont({
  src: "../../public/fonts/ArchitectsDaughter-Regular.woff2",
  variable: "--font-display-primary",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const caveat = localFont({
  src: "../../public/fonts/Caveat-Regular.woff2",
  variable: "--font-display-cyr",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const patrickHand = localFont({
  src: "../../public/fonts/PatrickHand-Regular.woff2",
  variable: "--font-hand-primary",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const pangolin = localFont({
  src: "../../public/fonts/Pangolin-Regular.woff2",
  variable: "--font-hand-cyr",
  weight: "400",
  style: "normal",
  display: "swap",
});

/**
 * Combined className string exposing all four brand font CSS variables.
 * Apply once on `<html>` in the root layout.
 */
export const brandFontVariables = [
  architectsDaughter.variable,
  caveat.variable,
  patrickHand.variable,
  pangolin.variable,
].join(" ");
