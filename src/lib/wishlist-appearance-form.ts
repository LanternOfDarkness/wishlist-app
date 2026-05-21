import type { Prisma } from "@prisma/client";
import {
  normalizeWishlistBannerDisplayMode,
  normalizeWishlistColorPreset,
  normalizeWishlistFontClass,
  normalizeWishlistItemBorderClass,
  normalizeWishlistThemeMode,
  readWishlistAppearanceBoolean,
} from "./wishlist-appearance";
import type {
  BannerDisplayMode,
  ColorPreset,
  WishlistFontClass,
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
  font?: WishlistFontClass;
  favoriteCurrencies?: string[];
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getStringArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
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
    colorPreset: normalizeWishlistColorPreset(getString(formData, "colorPreset")),
    bannerDisplayMode: normalizeWishlistBannerDisplayMode(
      getString(formData, "bannerDisplayMode"),
    ),
    advancedColorsEnabled: readWishlistAppearanceBoolean(
      getString(formData, "advancedColorsEnabled"),
    ),
    advancedPrimaryColor: getString(formData, "advancedPrimaryColor"),
    advancedBackgroundColor: getString(formData, "advancedBackgroundColor"),
    advancedTextColor: getString(formData, "advancedTextColor"),
    bgImage: getString(formData, "bgImage"),
    bannerImage: getString(formData, "bannerImage"),
    welcomeMessage: getString(formData, "welcomeMessage"),
    itemBorder: normalizeWishlistItemBorderClass(getString(formData, "itemBorder")),
    themeMode: normalizeWishlistThemeMode(getString(formData, "themeMode")),
    font: normalizeWishlistFontClass(getString(formData, "font")),
    favoriteCurrencies:
      favoriteCurrencies.length > 0 ? favoriteCurrencies : ["UAH"],
  };
}
