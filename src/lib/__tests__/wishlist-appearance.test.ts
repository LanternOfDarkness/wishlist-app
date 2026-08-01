import { describe, expect, it } from "vitest";
import {
  ALLOWED_ITEM_BORDER_CLASSES,
  APPEARANCE_PRESETS,
  MIN_CONTRAST_RATIO,
  getAdvancedColorSeedForPreset,
  getContrastRatio,
  getWishlistAppearancePresentation,
  getWishlistSettingsState,
  getWishlistWidgetPresentation,
  getWishlistWidgetSettingsState,
  hasSufficientContrast,
  migrateLegacyAppearanceColors,
  normalizeWidgetItemSize,
  normalizeWishlistFontClass,
  normalizeWishlistItemBorderClass,
  parseWishlistAppearance,
  resolveWishlistAppearance,
  stripItemBorderRadius,
  type AppearanceTokens,
} from "../wishlist-appearance";

const TOKEN_KEYS: Array<keyof AppearanceTokens> = [
  "primary",
  "primaryForeground",
  "background",
  "foreground",
  "card",
  "cardForeground",
  "muted",
  "mutedForeground",
  "popover",
  "popoverForeground",
  "border",
  "input",
  "ring",
];

describe("resolveWishlistAppearance", () => {
  it("empty appearance uses the light preset", () => {
    const resolved = resolveWishlistAppearance({});

    expect(resolved.preset).toBe("light");
    expect(resolved.tokens).toEqual(APPEARANCE_PRESETS.light.tokens);
    expect(resolved.cssVariables["--background"]).toBe(
      APPEARANCE_PRESETS.light.tokens.background,
    );
    expect(resolved.cssVariables["--popover-foreground"]).toBe(
      APPEARANCE_PRESETS.light.tokens.popoverForeground,
    );
    expect(resolved.primaryColor).toBe(APPEARANCE_PRESETS.light.primaryColor);
    expect(resolved.advancedColorsApplied).toBe(false);
    expect(resolved.banner.visible).toBe(true);
    expect(resolved.banner.style).toEqual({
      backgroundColor: APPEARANCE_PRESETS.light.tokens.primary,
    });
    expect(resolved.page.style).toEqual({ minHeight: "100vh" });
    expect(resolved.layout.overlapBanner).toBe(true);
  });

  it.each(["light", "rose", "green", "dark", "minimal", "paper", "chalk"] as const)(
    "preset %s returns a complete token set",
    (preset) => {
      const resolved = resolveWishlistAppearance({ colorPreset: preset });

      expect(resolved.preset).toBe(preset);
      expect(APPEARANCE_PRESETS[preset].labelKey).toBeTypeOf("string");
      expect(Object.keys(resolved.tokens).sort()).toEqual([
        ...TOKEN_KEYS,
      ].sort());
      for (const key of TOKEN_KEYS) {
        expect(resolved.tokens[key]).toBeTypeOf("string");
        expect(resolved.tokens[key]).not.toHaveLength(0);
      }
      expect(resolved.cssVariables["--background"]).toBe(
        resolved.tokens.background,
      );
      expect(resolved.cssVariables["--popover-foreground"]).toBe(
        resolved.tokens.popoverForeground,
      );
    expect(resolved.advancedColorsApplied).toBe(false);
    expect(resolved.banner.visible).toBe(true);
    expect(resolved.banner.style).toEqual({
      backgroundColor: resolved.tokens.primary,
    });
    expect(resolved.page.style).toEqual({ minHeight: "100vh" });
    expect(resolved.layout.overlapBanner).toBe(true);
    },
  );

  it("advanced colors apply when readable", () => {
    const resolved = resolveWishlistAppearance({
      colorPreset: "rose",
      advancedColorsEnabled: true,
      advancedPrimaryColor: "#3b82f6",
      advancedBackgroundColor: "#ffffff",
      advancedTextColor: "#111827",
    });

    expect(resolved.preset).toBe("rose");
    expect(resolved.advancedColorsApplied).toBe(true);
    expect(resolved.primaryColor).toBe("#3b82f6");
    expect(resolved.tokens.primary).toBe("#3b82f6");
    expect(resolved.tokens.background).toBe("#ffffff");
    expect(resolved.tokens.foreground).toBe("#111827");
    expect(resolved.tokens.card).toBe(APPEARANCE_PRESETS.rose.tokens.card);
    expect(resolved.cssVariables["--background"]).toBe("#ffffff");
    expect(resolved.cssVariables["--popover-foreground"]).toBe(
      APPEARANCE_PRESETS.rose.tokens.popoverForeground,
    );
    expect(resolved.banner.style.backgroundColor).toBe("#3b82f6");
    expect(resolved.page.style).toEqual({ minHeight: "100vh" });
    expect(getContrastRatio("#ffffff", "#111827")).toBeGreaterThanOrEqual(4.5);
  });

  it("advanced colors fall back to the preset when unreadable", () => {
    const resolved = resolveWishlistAppearance({
      colorPreset: "rose",
      advancedColorsEnabled: true,
      advancedPrimaryColor: "#3b82f6",
      advancedBackgroundColor: "#111827",
      advancedTextColor: "#374151",
    });

    expect(resolved.preset).toBe("rose");
    expect(resolved.advancedColorsApplied).toBe(false);
    expect(resolved.tokens).toEqual(APPEARANCE_PRESETS.rose.tokens);
    expect(resolved.primaryColor).toBe(APPEARANCE_PRESETS.rose.primaryColor);
    expect(resolved.cssVariables["--background"]).toBe(
      APPEARANCE_PRESETS.rose.tokens.background,
    );
    expect(resolved.cssVariables["--popover-foreground"]).toBe(
      APPEARANCE_PRESETS.rose.tokens.popoverForeground,
    );
  });

  it("invalid advanced colors fall back to the preset", () => {
    const resolved = resolveWishlistAppearance({
      colorPreset: "green",
      advancedColorsEnabled: true,
      advancedPrimaryColor: "not-a-color",
      advancedBackgroundColor: "#ffffff",
      advancedTextColor: "#111827",
    });

    expect(resolved.preset).toBe("green");
    expect(resolved.advancedColorsApplied).toBe(false);
    expect(resolved.tokens).toEqual(APPEARANCE_PRESETS.green.tokens);
    expect(resolved.cssVariables["--background"]).toBe(
      APPEARANCE_PRESETS.green.tokens.background,
    );
    expect(resolved.cssVariables["--popover-foreground"]).toBe(
      APPEARANCE_PRESETS.green.tokens.popoverForeground,
    );
  });

  it("legacy primaryColor, bgColor, textColor work as fallback when no preset exists", () => {
    const resolved = resolveWishlistAppearance({
      primaryColor: "#0f172a",
      bgColor: "#f8fafc",
      textColor: "#1e293b",
    });

    expect(resolved.preset).toBe("light");
    expect(resolved.advancedColorsApplied).toBe(true);
    expect(resolved.primaryColor).toBe("#0f172a");
    expect(resolved.tokens.primary).toBe("#0f172a");
    expect(resolved.tokens.background).toBe("#f8fafc");
    expect(resolved.tokens.foreground).toBe("#1e293b");
    expect(resolved.tokens.card).toBe(APPEARANCE_PRESETS.light.tokens.card);
    expect(resolved.cssVariables["--background"]).toBe("#f8fafc");
    expect(resolved.cssVariables["--popover-foreground"]).toBe(
      APPEARANCE_PRESETS.light.tokens.popoverForeground,
    );
    expect(resolved.banner.style.backgroundColor).toBe("#0f172a");
  });

  it("unsafe image URLs are ignored", () => {
    const resolved = resolveWishlistAppearance({
      bannerImage: "javascript:alert(1)",
      bgImage: "data:image/png;base64,AAAA",
    });

    expect(resolved.banner.visible).toBe(true);
    expect(resolved.banner.style).toEqual({
      backgroundColor: APPEARANCE_PRESETS.light.tokens.primary,
    });
    expect(resolved.page.style).toEqual({ minHeight: "100vh" });
    expect(resolved.layout.overlapBanner).toBe(true);
  });

  it("banner-and-page returns correct banner/page styles and overlap behavior", () => {
    const resolved = resolveWishlistAppearance({
      bannerDisplayMode: "banner-and-page",
      bannerImage: "https://example.com/banner.jpg",
      bgImage: "https://example.com/page.jpg",
      colorPreset: "light",
    });

    expect(resolved.preset).toBe("light");
    expect(resolved.banner.visible).toBe(true);
    expect(resolved.banner.style.backgroundImage).toBe(
      "url(https://example.com/banner.jpg)",
    );
    expect(resolved.page.style.backgroundImage).toBe(
      "url(https://example.com/page.jpg)",
    );
    expect(resolved.page.style.backgroundSize).toBe("cover");
    expect(resolved.page.style.backgroundAttachment).toBe("fixed");
    expect(resolved.page.style).toEqual({
      backgroundImage: "url(https://example.com/page.jpg)",
      backgroundSize: "cover",
      backgroundAttachment: "fixed",
      minHeight: "100vh",
    });
    expect(resolved.layout.overlapBanner).toBe(true);
  });

  it("banner-only returns correct banner/page styles and overlap behavior", () => {
    const resolved = resolveWishlistAppearance({
      bannerDisplayMode: "banner-only",
      bannerImage: "https://example.com/banner.jpg",
      bgImage: "https://example.com/page.jpg",
      colorPreset: "light",
    });

    expect(resolved.preset).toBe("light");
    expect(resolved.banner.visible).toBe(true);
    expect(resolved.banner.style.backgroundImage).toBe(
      "url(https://example.com/banner.jpg)",
    );
    expect(resolved.page.style).toEqual({ minHeight: "100vh" });
    expect(resolved.layout.overlapBanner).toBe(true);
  });

  it("page-only returns correct banner/page styles and overlap behavior", () => {
    const resolved = resolveWishlistAppearance({
      bannerDisplayMode: "page-only",
      bannerImage: "https://example.com/banner.jpg",
      bgImage: "https://example.com/page.jpg",
      colorPreset: "light",
    });

    expect(resolved.preset).toBe("light");
    expect(resolved.banner.visible).toBe(false);
    expect(resolved.page.style).toEqual({
      backgroundImage: "url(https://example.com/page.jpg)",
      minHeight: "100vh",
    });
    expect(resolved.layout.overlapBanner).toBe(false);
  });
});

describe("brand palette presets (paper/chalk)", () => {
  it("paper foreground/background clear MIN_CONTRAST_RATIO", () => {
    expect(
      hasSufficientContrast(
        APPEARANCE_PRESETS.paper.tokens.foreground,
        APPEARANCE_PRESETS.paper.tokens.background,
      ),
    ).toBe(true);
  });

  it("chalk foreground/background clear MIN_CONTRAST_RATIO", () => {
    expect(
      hasSufficientContrast(
        APPEARANCE_PRESETS.chalk.tokens.foreground,
        APPEARANCE_PRESETS.chalk.tokens.background,
      ),
    ).toBe(true);
  });
});

describe("normalizeWishlistFontClass", () => {
  it("round-trips font-sketch unchanged", () => {
    expect(normalizeWishlistFontClass("font-sketch")).toBe("font-sketch");
  });

  it("falls back to font-sans for an unknown value", () => {
    expect(normalizeWishlistFontClass("font-made-up")).toBe("font-sans");
  });
});

describe("normalizeWishlistItemBorderClass", () => {
  it("round-trips rounded-lg border-sketch unchanged", () => {
    expect(normalizeWishlistItemBorderClass("rounded-lg border-sketch")).toBe(
      "rounded-lg border-sketch",
    );
  });

  it("falls back to rounded-lg border-solid for an unknown value", () => {
    expect(normalizeWishlistItemBorderClass("not-a-real-border")).toBe(
      "rounded-lg border-solid",
    );
  });
});

describe("stripItemBorderRadius", () => {
  it("removes the rounded-* radius from every allowed item border class", () => {
    for (const borderClass of ALLOWED_ITEM_BORDER_CLASSES) {
      const noRadius = stripItemBorderRadius(borderClass);
      expect(noRadius).not.toMatch(/rounded-/);
      expect(noRadius).toBe(
        borderClass
          .split(" ")
          .filter((token) => !token.startsWith("rounded"))
          .join(" "),
      );
    }
  });

  it("leaves a radius-free class unchanged", () => {
    expect(stripItemBorderRadius("border-solid")).toBe("border-solid");
  });
});

describe("migrateLegacyAppearanceColors", () => {
  it("strips the legacy top-level color keys", () => {
    expect(
      migrateLegacyAppearanceColors({
        primaryColor: "#111111",
        bgColor: "#f5f5f5",
        textColor: "#222222",
        widgetLayout: "list",
      }),
    ).toEqual({ widgetLayout: "list" });
  });

  it("is a no-op when no legacy keys are present", () => {
    expect(
      migrateLegacyAppearanceColors({ widgetLayout: "grid" }),
    ).toEqual({ widgetLayout: "grid" });
  });
});

describe("parseWishlistAppearance", () => {
  it("allow-lists every known field, including font and itemBorder (unvalidated on write before this)", () => {
    const appearance = parseWishlistAppearance({
      colorPreset: "rose",
      bannerDisplayMode: "banner-only",
      advancedColorsEnabled: "true",
      advancedPrimaryColor: "#112233",
      advancedBackgroundColor: "#fefefe",
      advancedTextColor: "#111111",
      bgImage: "https://example.com/bg.jpg",
      bannerImage: "https://example.com/banner.jpg",
      welcomeMessage: "Hi",
      itemBorder: "rounded-2xl border-solid",
      font: "font-serif",
      favoriteCurrencies: ["USD", "EUR"],
    });

    expect(appearance).toMatchObject({
      colorPreset: "rose",
      bannerDisplayMode: "banner-only",
      advancedColorsEnabled: true,
      advancedPrimaryColor: "#112233",
      advancedBackgroundColor: "#fefefe",
      advancedTextColor: "#111111",
      bgImage: "https://example.com/bg.jpg",
      bannerImage: "https://example.com/banner.jpg",
      welcomeMessage: "Hi",
      itemBorder: "rounded-2xl border-solid",
      font: "font-serif",
      favoriteCurrencies: ["USD", "EUR"],
    });
  });

  it("normalizes an invalid font and itemBorder to safe defaults on write", () => {
    const appearance = parseWishlistAppearance({
      font: "font-made-up",
      itemBorder: "not-a-real-border",
    });

    expect(appearance.font).toBe("font-sans");
    expect(appearance.itemBorder).toBe("rounded-lg border-solid");
  });

  it("maps a legacy itemBorder shorthand to its full form on write", () => {
    expect(parseWishlistAppearance({ itemBorder: "rounded-md" }).itemBorder).toBe(
      "rounded-md border-solid",
    );
  });

  it("normalizes unknown preset and display mode to safe defaults", () => {
    const appearance = parseWishlistAppearance({
      colorPreset: "neon",
      bannerDisplayMode: "fullscreen",
    });

    expect(appearance.colorPreset).toBe("light");
    expect(appearance.bannerDisplayMode).toBe("banner-and-page");
  });

  it("accepts 'on' for a boolean field, unifying the readBoolean divergence", () => {
    expect(
      parseWishlistAppearance({ advancedColorsEnabled: "on" }).advancedColorsEnabled,
    ).toBe(true);
  });

  it("defaults favorite currencies to UAH when none are submitted", () => {
    expect(parseWishlistAppearance({}).favoriteCurrencies).toEqual(["UAH"]);
  });

  it("preserves unknown keys written by other actions (e.g. widgetLayout, widgetItemSize)", () => {
    const appearance = parseWishlistAppearance({
      widgetLayout: "list",
      widgetItemSize: 144,
      font: "font-mono",
    });

    expect(appearance).toMatchObject({
      widgetLayout: "list",
      widgetItemSize: 144,
      font: "font-mono",
    });
  });

  it("preserves unknown keys with the new sketch preset fields present", () => {
    const appearance = parseWishlistAppearance({
      colorPreset: "paper",
      font: "font-sketch",
      itemBorder: "rounded-lg border-sketch",
      widgetLayout: "list",
      widgetItemSize: 120,
    });

    expect(appearance).toMatchObject({
      colorPreset: "paper",
      font: "font-sketch",
      itemBorder: "rounded-lg border-sketch",
      widgetLayout: "list",
      widgetItemSize: 120,
    });
  });

  it("treats non-object input as empty", () => {
    expect(parseWishlistAppearance(null).favoriteCurrencies).toEqual(["UAH"]);
    expect(parseWishlistAppearance("nonsense").colorPreset).toBe("light");
  });
});

describe("getWishlistSettingsState", () => {
  it("normalizes appearance defaults for settings adapters", () => {
    expect(getWishlistSettingsState(undefined)).toMatchObject({
      favoriteCurrencies: ["UAH"],
      font: "font-sans",
      itemBorder: "rounded-lg border-solid",
      colorPreset: "light",
      advancedColorsEnabled: false,
      bannerDisplayMode: "banner-and-page",
    });
  });

  it("does not return a themeMode or rawAppearance field (both dead)", () => {
    const state = getWishlistSettingsState({ themeMode: "dark" });
    expect(state).not.toHaveProperty("themeMode");
    expect(state).not.toHaveProperty("rawAppearance");
  });

  it("normalizes legacy and invalid appearance values", () => {
    expect(
      getWishlistSettingsState({
        favoriteCurrencies: ["USD", 123, "EUR"],
        font: "unknown",
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
      itemBorder: "rounded-md border-solid",
      colorPreset: "green",
      advancedColorsEnabled: true,
      advancedPrimaryColor: "#16a34a",
      advancedBackgroundColor: "#ffffff",
      advancedTextColor: "#111827",
      bannerDisplayMode: "banner-only",
    });
  });

  it("accepts 'on' for advancedColorsEnabled (previously only wishlist-appearance.ts's copy did)", () => {
    expect(
      getWishlistSettingsState({ advancedColorsEnabled: "on" }).advancedColorsEnabled,
    ).toBe(true);
  });
});

describe("getWishlistWidgetSettingsState", () => {
  it("normalizes widget layout and item size", () => {
    expect(
      getWishlistWidgetSettingsState({ widgetLayout: "list", widgetItemSize: 42 }),
    ).toEqual({ layout: "list", itemSize: 70 });

    expect(
      getWishlistWidgetSettingsState({ widgetLayout: "unknown", widgetItemSize: 500 }),
    ).toEqual({ layout: "grid", itemSize: 160 });
  });
});

describe("normalizeWidgetItemSize", () => {
  it("clamps to the 70-160 range and defaults to 100", () => {
    expect(normalizeWidgetItemSize(40)).toBe(70);
    expect(normalizeWidgetItemSize(500)).toBe(160);
    expect(normalizeWidgetItemSize(undefined)).toBe(100);
    expect(normalizeWidgetItemSize("not-a-number")).toBe(100);
  });
});

describe("hasSufficientContrast", () => {
  it("matches the same 4.5 WCAG AA threshold resolveWishlistAppearance enforces", () => {
    expect(hasSufficientContrast("#ffffff", "#111827")).toBe(true);
    expect(hasSufficientContrast("#374151", "#111827")).toBe(false);
  });

  it("uses the exported MIN_CONTRAST_RATIO as its threshold", () => {
    expect(MIN_CONTRAST_RATIO).toBe(4.5);
    expect(getContrastRatio("#ffffff", "#111827")).toBeGreaterThanOrEqual(
      MIN_CONTRAST_RATIO,
    );
  });
});

describe("getAdvancedColorSeedForPreset", () => {
  it("seeds the advanced color pickers from the preset's own tokens", () => {
    expect(getAdvancedColorSeedForPreset("rose")).toEqual({
      primaryColor: APPEARANCE_PRESETS.rose.primaryColor,
      backgroundColor: APPEARANCE_PRESETS.rose.tokens.background,
      textColor: APPEARANCE_PRESETS.rose.tokens.foreground,
    });
  });

  it("returns a different seed for each preset (regression: preset switches silently kept stale colors)", () => {
    const rose = getAdvancedColorSeedForPreset("rose");
    const dark = getAdvancedColorSeedForPreset("dark");
    expect(rose).not.toEqual(dark);
  });
});

describe("getWishlistAppearancePresentation", () => {
  it("normalizes appearance presentation values for both route adapters", () => {
    const presentation = getWishlistAppearancePresentation({
      font: "font-comic",
      itemBorder: "rounded-lg border-dashed",
      welcomeMessage: "Hello",
      favoriteCurrencies: ["UAH", 123, "EUR"],
    });

    expect(presentation.fontClass).toBe("font-comic");
    expect(presentation.itemBorderClass).toBe("rounded-lg border-dashed");
    expect(presentation.welcomeMessage).toBe("Hello");
    expect(presentation.favoriteCurrencies).toEqual(["UAH", "EUR"]);
  });

  it("derives the radius-free item border class for the outer frame", () => {
    const presentation = getWishlistAppearancePresentation({
      itemBorder: "rounded-2xl border-solid",
    });

    expect(presentation.itemBorderClass).toBe("rounded-2xl border-solid");
    expect(presentation.itemBorderClassNoRadius).toBe("border-solid");
  });
});

describe("getWishlistWidgetPresentation", () => {
  it("normalizes widget presentation values", () => {
    expect(
      getWishlistWidgetPresentation({
        widgetLayout: "list",
        widgetItemSize: 40,
      }),
    ).toEqual({
      widgetLayout: "list",
      widgetItemSize: 70,
    });
    expect(
      getWishlistWidgetPresentation({
        widgetLayout: "unknown",
        widgetItemSize: 500,
      }),
    ).toEqual({
      widgetLayout: "grid",
      widgetItemSize: 160,
    });
  });
});
