import { describe, expect, it } from "vitest";

import {
  getWishlistSettingsState,
  getWishlistWidgetSettingsState,
  shouldUseDarkTheme,
} from "../wishlist-settings-state";

describe("wishlist settings state", () => {
  it("normalizes appearance defaults for settings adapters", () => {
    expect(getWishlistSettingsState(undefined)).toMatchObject({
      favoriteCurrencies: ["UAH"],
      font: "font-sans",
      themeMode: "system",
      itemBorder: "rounded-lg border-solid",
      colorPreset: "light",
      advancedColorsEnabled: false,
      bannerDisplayMode: "banner-and-page",
    });
  });

  it("normalizes legacy and invalid appearance values", () => {
    expect(
      getWishlistSettingsState({
        favoriteCurrencies: ["USD", 123, "EUR"],
        font: "unknown",
        themeMode: "dark",
        itemBorder: "rounded-md",
        colorPreset: "green",
        advancedColorsEnabled: "true",
        advancedPrimaryColor: "16A34A",
        advancedBackgroundColor: "invalid",
        advancedTextColor: "#111827",
        bannerDisplayMode: "banner-only",
      }),
    ).toMatchObject({
      favoriteCurrencies: ["USD", "EUR"],
      font: "font-sans",
      themeMode: "dark",
      itemBorder: "rounded-md border-solid",
      colorPreset: "green",
      advancedColorsEnabled: true,
      advancedPrimaryColor: "#16a34a",
      advancedBackgroundColor: "#ffffff",
      advancedTextColor: "#111827",
      bannerDisplayMode: "banner-only",
    });
  });

  it("normalizes widget settings and theme choice", () => {
    expect(
      getWishlistWidgetSettingsState({
        widgetLayout: "list",
        widgetItemSize: 42,
      }),
    ).toEqual({
      layout: "list",
      itemSize: 70,
    });

    expect(shouldUseDarkTheme("system", true)).toBe(true);
    expect(shouldUseDarkTheme("light", true)).toBe(false);
    expect(shouldUseDarkTheme("dark", false)).toBe(true);
  });
});
