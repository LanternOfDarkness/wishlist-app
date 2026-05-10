import type { CSSProperties } from "react";

import { isSafeUrl } from "./utils";

export type ColorPreset = "light" | "rose" | "green" | "dark" | "minimal";
export type BannerDisplayMode = "banner-and-page" | "banner-only" | "page-only";

export interface AppearanceTokens {
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
}

export type WishlistAppearance = Record<string, unknown> & {
  colorPreset?: unknown;
  bannerDisplayMode?: unknown;
  advancedColorsEnabled?: unknown;
  advancedPrimaryColor?: unknown;
  advancedBackgroundColor?: unknown;
  advancedTextColor?: unknown;
  primaryColor?: unknown;
  bgColor?: unknown;
  textColor?: unknown;
  bannerImage?: unknown;
  bgImage?: unknown;
};

type ThemePreset = {
  primaryColor: string;
  labelKey: string;
  tokens: AppearanceTokens;
};

export const APPEARANCE_PRESETS: Record<ColorPreset, ThemePreset> = {
  light: {
    primaryColor: "#0f172a",
    labelKey: "appearance.presets.light",
    tokens: {
      primary: "#1e293b",
      primaryForeground: "#f8fafc",
      background: "#ffffff",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#f1f5f9",
      mutedForeground: "#475569",
      popover: "#ffffff",
      popoverForeground: "#0f172a",
      border: "#e2e8f0",
      input: "#e2e8f0",
      ring: "#0f172a",
    },
  },
  rose: {
    primaryColor: "#e11d48",
    labelKey: "appearance.presets.rose",
    tokens: {
      primary: "#e11d48",
      primaryForeground: "#fff1f2",
      background: "#ffffff",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#fff1f2",
      mutedForeground: "#9f1239",
      popover: "#ffffff",
      popoverForeground: "#0f172a",
      border: "#ffe4e6",
      input: "#ffe4e6",
      ring: "#e11d48",
    },
  },
  green: {
    primaryColor: "#16a34a",
    labelKey: "appearance.presets.green",
    tokens: {
      primary: "#16a34a",
      primaryForeground: "#f0fdf4",
      background: "#ffffff",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#f0fdf4",
      mutedForeground: "#166534",
      popover: "#ffffff",
      popoverForeground: "#0f172a",
      border: "#dcfce7",
      input: "#dcfce7",
      ring: "#16a34a",
    },
  },
  dark: {
    primaryColor: "#f8fafc",
    labelKey: "appearance.presets.dark",
    tokens: {
      primary: "#f8fafc",
      primaryForeground: "#0f172a",
      background: "#020617",
      foreground: "#f8fafc",
      card: "#0f172a",
      cardForeground: "#f8fafc",
      muted: "#1e293b",
      mutedForeground: "#cbd5e1",
      popover: "#0f172a",
      popoverForeground: "#f8fafc",
      border: "#1e293b",
      input: "#1e293b",
      ring: "#cbd5e1",
    },
  },
  minimal: {
    primaryColor: "#52525b",
    labelKey: "appearance.presets.minimal",
    tokens: {
      primary: "#52525b",
      primaryForeground: "#fafafa",
      background: "#fafafa",
      foreground: "#111827",
      card: "#fafafa",
      cardForeground: "#111827",
      muted: "#f4f4f5",
      mutedForeground: "#71717a",
      popover: "#fafafa",
      popoverForeground: "#111827",
      border: "#e5e7eb",
      input: "#e5e7eb",
      ring: "#52525b",
    },
  },
};

export function getContrastRatio(foreground: string, background: string) {
  const fg = normalizeHexColor(foreground);
  const bg = normalizeHexColor(background);

  if (!fg || !bg) {
    return 1;
  }

  const [fr, fgChannel, fb] = hexToRgb(fg);
  const [br, bgChannel, bb] = hexToRgb(bg);
  const fgLuminance = relativeLuminance(fr, fgChannel, fb);
  const bgLuminance = relativeLuminance(br, bgChannel, bb);
  const [lighter, darker] = fgLuminance > bgLuminance
    ? [fgLuminance, bgLuminance]
    : [bgLuminance, fgLuminance];

  return (lighter + 0.05) / (darker + 0.05);
}

export interface ResolvedWishlistAppearance {
  preset: ColorPreset;
  tokens: AppearanceTokens;
  cssVariables: Record<`--${string}`, string>;
  primaryColor: string;
  advancedColorsApplied: boolean;
  banner: {
    visible: boolean;
    style: CSSProperties;
  };
  page: {
    style: CSSProperties;
  };
  layout: {
    overlapBanner: boolean;
  };
}

export function resolveWishlistAppearance(
  appearance: WishlistAppearance = {},
): ResolvedWishlistAppearance {
  const presetValue = getString(appearance, "colorPreset");
  const preset = selectPresetName(presetValue);
  const presetTheme = APPEARANCE_PRESETS[preset];
  const presetExists = Boolean(
    presetValue &&
      (presetValue === "light" ||
        presetValue === "rose" ||
        presetValue === "green" ||
        presetValue === "dark" ||
        presetValue === "minimal"),
  );
  const advanced = resolveAdvancedColors(appearance);
  const legacy = !advanced && !presetExists
    ? resolveLegacyColors(appearance)
    : null;
  const custom = advanced ?? legacy;
  const appliedTokens = custom
    ? buildCustomTokens(presetTheme.tokens, custom)
    : presetTheme.tokens;
  const resolvedPrimaryColor = custom?.primaryColor ?? presetTheme.primaryColor;
  const cssVariables = tokensToCssVariables(appliedTokens);
  const displayMode = selectBannerDisplayMode(appearance);
  const overlapBanner = displayMode !== "page-only";
  const bannerVisible = displayMode !== "page-only";

  const bannerImage = getString(appearance, "bannerImage");
  const safeBannerImage = bannerVisible && isSafeUrl(bannerImage) ? bannerImage : null;
  const bgImage = getString(appearance, "bgImage");
  const safeBgImage =
    displayMode !== "banner-only" && isSafeUrl(bgImage) ? bgImage : null;

  const bannerStyle: CSSProperties = {
    backgroundColor: appliedTokens.primary,
  };

  if (safeBannerImage) {
    bannerStyle.backgroundImage = `url(${safeBannerImage})`;
    bannerStyle.backgroundSize = "cover";
    bannerStyle.backgroundPosition = "center";
    bannerStyle.backgroundRepeat = "no-repeat";
  }

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
  };

  if (safeBgImage) {
    pageStyle.backgroundImage = `url(${safeBgImage})`;
    if (displayMode === "banner-and-page") {
      pageStyle.backgroundSize = "cover";
      pageStyle.backgroundAttachment = "fixed";
    }
  }

  return {
    preset,
    tokens: appliedTokens,
    cssVariables,
    primaryColor: resolvedPrimaryColor,
    advancedColorsApplied: Boolean(custom),
    banner: {
      visible: bannerVisible,
      style: bannerStyle,
    },
    page: {
      style: pageStyle,
    },
    layout: {
      overlapBanner,
    },
  };
}

function selectPresetName(preset: string | undefined): ColorPreset {

  if (
    preset === "light" ||
    preset === "rose" ||
    preset === "green" ||
    preset === "dark" ||
    preset === "minimal"
  ) {
    return preset;
  }

  return "light";
}

function selectBannerDisplayMode(appearance: WishlistAppearance): BannerDisplayMode {
  const mode = getString(appearance, "bannerDisplayMode");

  if (
    mode === "banner-and-page" ||
    mode === "banner-only" ||
    mode === "page-only"
  ) {
    return mode;
  }

  return "banner-and-page";
}

function resolveAdvancedColors(appearance: WishlistAppearance) {
  if (!readBoolean(appearance, "advancedColorsEnabled")) {
    return null;
  }

  const primary = normalizeHexColor(getString(appearance, "advancedPrimaryColor"));
  const background = normalizeHexColor(getString(appearance, "advancedBackgroundColor"));
  const text = normalizeHexColor(getString(appearance, "advancedTextColor"));

  if (!primary || !background || !text) {
    return null;
  }

  if (getContrastRatio(text, background) < 4.5) {
    return null;
  }

  return {
    primaryColor: primary,
    backgroundColor: background,
    foregroundColor: text,
    kind: "advanced" as const,
  };
}

function resolveLegacyColors(appearance: WishlistAppearance) {
  const primary = normalizeHexColor(getString(appearance, "primaryColor"));
  const background = normalizeHexColor(getString(appearance, "bgColor"));
  const text = normalizeHexColor(getString(appearance, "textColor"));

  if (primary && background && text && getContrastRatio(text, background) >= 4.5) {
    return {
      primaryColor: primary,
      backgroundColor: background,
      foregroundColor: text,
      kind: "legacy" as const,
    };
  }

  return null;
}

function buildCustomTokens(
  presetTokens: AppearanceTokens,
  custom:
    | {
        primaryColor: string;
        backgroundColor: string;
        foregroundColor: string;
        kind: "advanced" | "legacy";
      }
    | null,
): AppearanceTokens {
  if (!custom) {
    return presetTokens;
  }

  return {
    primary: custom.primaryColor,
    primaryForeground: pickReadableForeground(custom.primaryColor),
    background: custom.backgroundColor,
    foreground: custom.foregroundColor,
    card: presetTokens.card,
    cardForeground: presetTokens.cardForeground,
    muted: presetTokens.muted,
    mutedForeground: presetTokens.mutedForeground,
    popover: presetTokens.popover,
    popoverForeground: presetTokens.popoverForeground,
    border: presetTokens.border,
    input: presetTokens.input,
    ring: presetTokens.ring,
  };
}

function tokensToCssVariables(tokens: AppearanceTokens): Record<`--${string}`, string> {
  return {
    "--primary": tokens.primary,
    "--primary-foreground": tokens.primaryForeground,
    "--background": tokens.background,
    "--foreground": tokens.foreground,
    "--card": tokens.card,
    "--card-foreground": tokens.cardForeground,
    "--muted": tokens.muted,
    "--muted-foreground": tokens.mutedForeground,
    "--popover": tokens.popover,
    "--popover-foreground": tokens.popoverForeground,
    "--border": tokens.border,
    "--input": tokens.input,
    "--ring": tokens.ring,
  };
}

function getString(appearance: WishlistAppearance, key: string) {
  const value = appearance[key];
  return typeof value === "string" ? value.trim() : undefined;
}

function readBoolean(appearance: WishlistAppearance, key: string) {
  const value = appearance[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }

  return false;
}

function normalizeHexColor(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) {
    return null;
  }

  return `#${match[1].toLowerCase()}`;
}

function hexToRgb(hex: string) {
  const value = hex.slice(1);
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  ] as const;
}

function relativeLuminance(red: number, green: number, blue: number) {
  const transform = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  const r = transform(red);
  const g = transform(green);
  const b = transform(blue);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function pickReadableForeground(primary: string) {
  const whiteContrast = getContrastRatio("#ffffff", primary);
  const blackContrast = getContrastRatio("#000000", primary);

  return whiteContrast >= blackContrast ? "#ffffff" : "#000000";
}
