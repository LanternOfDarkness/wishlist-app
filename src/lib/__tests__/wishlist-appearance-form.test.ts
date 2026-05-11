import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildWishlistAppearanceFromFormData } from "../wishlist-appearance-form";

function buildFormData(
  values: Record<string, string | string[] | undefined>,
) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      formData.set(key, value);
    }
  }

  return formData;
}

describe("buildWishlistAppearanceFromFormData", () => {
  it("writes canonical preset and banner settings while preserving widget settings", () => {
    const currentAppearance: Prisma.JsonObject = {
      widgetLayout: "list",
      widgetItemSize: 144,
      primaryColor: "#111111",
      bgColor: "#f5f5f5",
      textColor: "#222222",
      favoriteCurrencies: ["USD"],
    };
    const formData = buildFormData({
      colorPreset: "rose",
      bannerDisplayMode: "banner-only",
      bannerImage: "https://example.com/banner.jpg",
      bgImage: "https://example.com/bg.jpg",
      welcomeMessage: "Hi",
      itemBorder: "rounded-lg border-solid",
      themeMode: "dark",
      font: "font-serif",
      favoriteCurrencies: ["USD", "EUR"],
    });

    const appearance = buildWishlistAppearanceFromFormData(
      currentAppearance,
      formData,
    );

    expect(appearance).toMatchObject({
      colorPreset: "rose",
      bannerDisplayMode: "banner-only",
      bannerImage: "https://example.com/banner.jpg",
      bgImage: "https://example.com/bg.jpg",
      welcomeMessage: "Hi",
      itemBorder: "rounded-lg border-solid",
      themeMode: "dark",
      font: "font-serif",
      favoriteCurrencies: ["USD", "EUR"],
      widgetLayout: "list",
      widgetItemSize: 144,
    });
    expect(appearance).not.toHaveProperty("primaryColor");
    expect(appearance).not.toHaveProperty("bgColor");
    expect(appearance).not.toHaveProperty("textColor");
  });

  it("enables advanced colors only when the toggle is submitted", () => {
    const currentAppearance: Prisma.JsonObject = {
      widgetLayout: "grid",
      widgetItemSize: 100,
    };

    const disabledAppearance = buildWishlistAppearanceFromFormData(
      currentAppearance,
      buildFormData({
        advancedPrimaryColor: "#112233",
        advancedBackgroundColor: "#fefefe",
        advancedTextColor: "#111111",
      }),
    );

    expect(disabledAppearance).toMatchObject({
      advancedColorsEnabled: false,
      advancedPrimaryColor: "#112233",
      advancedBackgroundColor: "#fefefe",
      advancedTextColor: "#111111",
      widgetLayout: "grid",
      widgetItemSize: 100,
    });

    const enabledAppearance = buildWishlistAppearanceFromFormData(
      currentAppearance,
      buildFormData({
        advancedColorsEnabled: "true",
        advancedPrimaryColor: "#112233",
        advancedBackgroundColor: "#fefefe",
        advancedTextColor: "#111111",
      }),
    );

    expect(enabledAppearance).toMatchObject({
      advancedColorsEnabled: true,
      advancedPrimaryColor: "#112233",
      advancedBackgroundColor: "#fefefe",
      advancedTextColor: "#111111",
      widgetLayout: "grid",
      widgetItemSize: 100,
    });
  });

  it("normalizes unknown preset and display mode to safe defaults", () => {
    const appearance = buildWishlistAppearanceFromFormData(
      {},
      buildFormData({
        colorPreset: "neon",
        bannerDisplayMode: "fullscreen",
      }),
    );

    expect(appearance.colorPreset).toBe("light");
    expect(appearance.bannerDisplayMode).toBe("banner-and-page");
  });

  it("defaults favorite currencies to UAH when none are submitted", () => {
    const appearance = buildWishlistAppearanceFromFormData(
      {},
      buildFormData({}),
    );

    expect(appearance.favoriteCurrencies).toEqual(["UAH"]);
    expect(appearance.themeMode).toBe("system");
    expect(appearance.font).toBe("font-sans");
  });
});
