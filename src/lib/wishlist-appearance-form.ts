import type { Prisma } from "@prisma/client";
import type {
  BannerDisplayMode,
  ColorPreset,
} from "./wishlist-appearance";

export type WishlistAppearanceFormData = Prisma.InputJsonObject & {
  colorPreset?: ColorPreset;
  bannerDisplayMode?: BannerDisplayMode;
  advancedColorsEnabled?: boolean;
  advancedPrimaryColor?: string;
  advancedBackgroundColor?: string;
  advancedTextColor?: string;
  bgImage?: string;
  bannerImage?: string;
  welcomeMessage?: string;
  itemBorder?: string;
  themeMode?: string;
  font?: string;
  favoriteCurrencies?: string[];
};

const VALID_COLOR_PRESETS: ColorPreset[] = [
  "light",
  "rose",
  "green",
  "dark",
  "minimal",
];

const VALID_BANNER_DISPLAY_MODES: BannerDisplayMode[] = [
  "banner-and-page",
  "banner-only",
  "page-only",
];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getStringArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

function normalizeColorPreset(value: string): ColorPreset {
  return VALID_COLOR_PRESETS.includes(value as ColorPreset)
    ? (value as ColorPreset)
    : "light";
}

function normalizeBannerDisplayMode(value: string): BannerDisplayMode {
  return VALID_BANNER_DISPLAY_MODES.includes(value as BannerDisplayMode)
    ? (value as BannerDisplayMode)
    : "banner-and-page";
}

export function buildWishlistAppearanceFromFormData(
  currentAppearance: Prisma.JsonObject,
  formData: FormData,
): WishlistAppearanceFormData {
  const appearanceWithoutLegacyColors: Record<
    string,
    Prisma.InputJsonValue | null | undefined
  > = {
    ...currentAppearance,
  };
  delete appearanceWithoutLegacyColors.primaryColor;
  delete appearanceWithoutLegacyColors.bgColor;
  delete appearanceWithoutLegacyColors.textColor;

  const favoriteCurrencies = getStringArray(formData, "favoriteCurrencies");

  return {
    ...appearanceWithoutLegacyColors,
    colorPreset: normalizeColorPreset(getString(formData, "colorPreset")),
    bannerDisplayMode: normalizeBannerDisplayMode(
      getString(formData, "bannerDisplayMode"),
    ),
    advancedColorsEnabled:
      getString(formData, "advancedColorsEnabled") === "true",
    advancedPrimaryColor: getString(formData, "advancedPrimaryColor"),
    advancedBackgroundColor: getString(formData, "advancedBackgroundColor"),
    advancedTextColor: getString(formData, "advancedTextColor"),
    bgImage: getString(formData, "bgImage"),
    bannerImage: getString(formData, "bannerImage"),
    welcomeMessage: getString(formData, "welcomeMessage"),
    itemBorder: getString(formData, "itemBorder"),
    themeMode: getString(formData, "themeMode") || "system",
    font: getString(formData, "font") || "font-sans",
    favoriteCurrencies:
      favoriteCurrencies.length > 0 ? favoriteCurrencies : ["UAH"],
  };
}
