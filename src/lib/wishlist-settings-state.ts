import {
  APPEARANCE_PRESETS,
  COLOR_PRESET_OPTIONS,
  BANNER_DISPLAY_MODE_OPTIONS,
  BANNER_MODE_LABELS,
  ITEM_BORDER_OPTIONS,
  FONT_OPTIONS,
  LEGACY_BORDER_DEFAULTS,
  type BannerDisplayMode,
  type ColorPreset,
} from "./wishlist-appearance";

export {
  COLOR_PRESET_OPTIONS,
  BANNER_DISPLAY_MODE_OPTIONS,
  BANNER_MODE_LABELS,
  ITEM_BORDER_OPTIONS,
  FONT_OPTIONS,
  type BannerDisplayMode,
  type ColorPreset,
};

type AppearanceValue = string | number | boolean | string[] | undefined;
type AppearanceRecord = Record<string, AppearanceValue>;

export type ThemeMode = "system" | "light" | "dark";
export type WidgetLayout = "grid" | "list";

export function getWishlistSettingsState(appearance: unknown) {
  const rawAppearance = getAppearanceRecord(appearance);
  const colorPreset = normalizeColorPreset(rawAppearance.colorPreset);
  const presetTheme = APPEARANCE_PRESETS[colorPreset];

  return {
    rawAppearance,
    favoriteCurrencies: getStringArray(rawAppearance.favoriteCurrencies, ["UAH"]),
    welcomeMessage: getString(rawAppearance.welcomeMessage),
    backgroundImage: getString(rawAppearance.bgImage),
    bannerImage: getString(rawAppearance.bannerImage),
    font: normalizeFont(rawAppearance.font),
    themeMode: normalizeThemeMode(rawAppearance.themeMode),
    itemBorder: normalizeItemBorder(rawAppearance.itemBorder),
    colorPreset,
    advancedColorsEnabled: readBoolean(rawAppearance.advancedColorsEnabled),
    advancedPrimaryColor: normalizeColorInputValue(
      getString(rawAppearance.advancedPrimaryColor) ||
        getString(rawAppearance.primaryColor) ||
        presetTheme.primaryColor,
      presetTheme.primaryColor,
    ),
    advancedBackgroundColor: normalizeColorInputValue(
      getString(rawAppearance.advancedBackgroundColor) ||
        getString(rawAppearance.bgColor) ||
        presetTheme.tokens.background,
      presetTheme.tokens.background,
    ),
    advancedTextColor: normalizeColorInputValue(
      getString(rawAppearance.advancedTextColor) ||
        getString(rawAppearance.textColor) ||
        presetTheme.tokens.foreground,
      presetTheme.tokens.foreground,
    ),
    bannerDisplayMode: normalizeBannerDisplayMode(rawAppearance.bannerDisplayMode),
  };
}

export function getWishlistWidgetSettingsState(appearance: unknown) {
  const rawAppearance = getAppearanceRecord(appearance);

  return {
    layout: rawAppearance.widgetLayout === "list" ? "list" : "grid",
    itemSize: normalizeWidgetItemSize(rawAppearance.widgetItemSize),
  } satisfies {
    layout: WidgetLayout;
    itemSize: number;
  };
}

export function shouldUseDarkTheme(themeMode: ThemeMode, systemPrefersDark: boolean) {
  return themeMode === "dark" || (themeMode === "system" && systemPrefersDark);
}

export function normalizeWidgetItemSize(value: AppearanceValue) {
  return typeof value === "number" ? Math.min(Math.max(Math.round(value), 70), 160) : 100;
}

function getAppearanceRecord(appearance: unknown): AppearanceRecord {
  if (!appearance || typeof appearance !== "object" || Array.isArray(appearance)) {
    return {};
  }

  return appearance as AppearanceRecord;
}

function getString(value: AppearanceValue) {
  return typeof value === "string" ? value : "";
}

function getStringArray(value: AppearanceValue, fallback: string[]) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : fallback;
}

function readBoolean(value: AppearanceValue) {
  return value === true || value === "true";
}

function normalizeColorPreset(value: AppearanceValue): ColorPreset {
  return COLOR_PRESET_OPTIONS.includes(value as ColorPreset)
    ? (value as ColorPreset)
    : "light";
}

function normalizeBannerDisplayMode(value: AppearanceValue): BannerDisplayMode {
  return BANNER_DISPLAY_MODE_OPTIONS.includes(value as BannerDisplayMode)
    ? (value as BannerDisplayMode)
    : "banner-and-page";
}

function normalizeThemeMode(value: AppearanceValue): ThemeMode {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function normalizeFont(value: AppearanceValue) {
  return FONT_OPTIONS.some((option) => option.value === value)
    ? (value as (typeof FONT_OPTIONS)[number]["value"])
    : "font-sans";
}

function normalizeItemBorder(value: AppearanceValue) {
  const stringValue = getString(value);
  const normalizedValue = LEGACY_BORDER_DEFAULTS[stringValue] || stringValue;

  return ITEM_BORDER_OPTIONS.some((option) => option.value === normalizedValue)
    ? normalizedValue
    : "rounded-lg border-solid";
}

function normalizeColorInputValue(value: string, fallback: string) {
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);

  if (!match) {
    return fallback;
  }

  return `#${match[1].toLowerCase()}`;
}
