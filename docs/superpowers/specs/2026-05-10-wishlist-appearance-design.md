# Wishlist Appearance Customization Design

## Context

The wishlist page currently stores appearance settings in `Wishlist.appearance` as JSON and applies user-provided `primaryColor`, `bgColor`, and `textColor` directly to CSS variables such as `--primary`, `--background`, and `--foreground`.

This creates compatibility problems because page components, filters, cards, buttons, dropdowns, and the embed widget expect a complete design-token set. Three independent colors cannot guarantee readable foreground/background, popover, muted, border, and card combinations.

## Goals

- Replace default color customization with five safe color presets.
- Include presets for light, rose, green, dark, and minimal appearances.
- Keep an advanced mode for users who want manual color control.
- Prevent unreadable foreground/background combinations from breaking the page or widget.
- Add display modes for showing both banner and page background, banner only, or page background only.
- Reuse the same appearance logic for the public wishlist page and embedded widget.
- Preserve existing profiles that already use legacy color fields.

## Non-Goals

- Do not add a Prisma migration for appearance settings.
- Do not redesign wishlist item management or widget item selection.
- Do not add image upload in this change; image fields remain URL-based.
- Do not make arbitrary custom themes the default path.

## Appearance Data Shape

`Wishlist.appearance` remains JSON. New settings use these keys:

```ts
type ColorPreset = "light" | "rose" | "green" | "dark" | "minimal";

type BannerDisplayMode =
  | "banner-and-page"
  | "banner-only"
  | "page-only";

type WishlistAppearance = {
  colorPreset?: ColorPreset;
  advancedColorsEnabled?: boolean;
  advancedPrimaryColor?: string;
  advancedBackgroundColor?: string;
  advancedTextColor?: string;
  bannerDisplayMode?: BannerDisplayMode;
  bannerImage?: string;
  bgImage?: string;
  welcomeMessage?: string;
  itemBorder?: string;
  themeMode?: string;
  font?: string;
  favoriteCurrencies?: string[];
  widgetLayout?: "grid" | "list";
  widgetItemSize?: number;

  // Legacy fields read as fallback only.
  primaryColor?: string;
  bgColor?: string;
  textColor?: string;
};
```

Existing `primaryColor`, `bgColor`, and `textColor` values are treated as legacy fallback. The settings UI writes the new keys after the user saves.

## Color Presets

Create five complete token presets:

- `light`: neutral light interface with dark text and a clear primary accent.
- `rose`: warm pink/rose accent with readable light surfaces.
- `green`: soft green accent with neutral readable surfaces.
- `dark`: dark interface with light text and restrained accent.
- `minimal`: low-chroma, mostly monochrome interface.

Each preset defines a full local token set:

```ts
type AppearanceTokens = {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  popover: string;
  popoverForeground: string;
  border: string;
  input: string;
  ring: string;
};
```

The public page and embed widget must apply the complete token set, not only primary/background/foreground.

## Advanced Colors

Advanced mode is optional and hidden behind a toggle labeled as manual color customization.

When enabled, the user can set:

- primary color
- background color
- text color

The resolver validates contrast between background and text. Manual colors are considered readable when the contrast ratio is at least 4.5:1. If any manual color is invalid or the background/text combination is not readable, the resolver falls back to the selected preset. The selected preset therefore remains the safety net for every profile.

Advanced colors should only override relevant tokens when valid. Other dependent tokens, such as card, popover, muted, border, and input, should be derived conservatively from the selected preset rather than guessed independently.

## Banner And Background Modes

Add `bannerDisplayMode` with these values:

- `banner-and-page`: show the banner area and use `bgImage` for the page background when valid.
- `banner-only`: show the banner area and keep the page background from the selected theme tokens.
- `page-only`: hide the large banner area and use `bgImage` for the page background when valid.

If a configured image URL fails `isSafeUrl`, ignore the image and use preset-driven colors.

The public wishlist page layout changes based on the mode:

- With a banner, keep the profile card overlapping the banner.
- Without a banner, remove the negative top margin and let the profile content start naturally.

## Settings UX

In the Appearance tab:

- Replace always-visible primary/text/background color pickers with a `Color scheme` preset picker.
- Show five preset options with swatches for background, card, primary, and text.
- Add an `Advanced color controls` toggle.
- Only show manual color pickers when advanced mode is enabled.
- Add a short warning that unreadable manual combinations will fall back to the selected preset.
- Keep banner and page background URL inputs.
- Add a `Background display` selector for the three banner modes.

The existing theme mode, welcome message, item border, font, and favorite currency settings remain in place.

## Public Wishlist Rendering

The public wishlist page should import a shared resolver that converts `Wishlist.appearance` into:

- CSS variable styles for local theme tokens.
- `primaryColor` for inline accents that cannot easily use Tailwind variables.
- banner visibility and banner style.
- page background style.
- layout flags for overlap or no-overlap profile positioning.

The resolver must be the only place that interprets presets, advanced colors, legacy fields, banner modes, and safe image URL rules.

## Embed Widget Rendering

The embed widget uses the same resolver and token presets as the public page.

Differences are layout-specific:

- The root iframe content applies compact token styles.
- Cards, footer, text, borders, and item price accents use resolved tokens.
- `page-only` hides the top banner in the widget.
- `banner-only` shows the banner while the widget root keeps preset background.
- `banner-and-page` uses the banner image for the top banner and the page background image for the widget root when each URL is valid.

This keeps embedded output visually consistent with the public page while preserving widget-specific sizing and layout.

## Testing

Add unit tests for the shared resolver:

- returns the default light preset for empty appearance.
- returns all expected tokens for each preset.
- falls back to the selected preset when advanced colors fail contrast.
- accepts valid advanced color combinations.
- ignores unsafe banner and background image URLs.
- returns correct banner/page visibility for each display mode.
- supports legacy `primaryColor`, `bgColor`, and `textColor` fallback.

Add focused rendering tests if the project already has a practical component testing pattern. Otherwise, validate via TypeScript, lint, resolver tests, and local page/widget inspection.

## Migration And Compatibility

No database migration is required because settings are stored as JSON.

Existing profiles keep rendering through legacy fallback. Once a user saves the Appearance form, new keys are written and become canonical.

## Acceptance Criteria

- Users can choose one of five color presets, including rose, green, dark, light, and minimal.
- Manual color pickers are only visible in advanced mode.
- Unreadable manual color choices do not break the public page or widget.
- Public wishlist page dropdowns, filters, cards, buttons, muted text, and popovers remain readable under every preset.
- Users can choose between banner plus page background, banner only, and page background only.
- The embed widget uses the same appearance logic as the public page.
- Legacy appearance settings continue to render.
