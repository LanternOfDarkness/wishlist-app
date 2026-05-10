# Wishlist Appearance Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragile free-form wishlist color customization with safe presets, optional advanced colors, banner/page display modes, and shared rendering logic for the public page and embed widget.

**Architecture:** Put all appearance interpretation in focused pure helpers under `src/lib`, then make the settings form, server action, public wishlist page, and embed page consume those helpers. The public page and widget should receive full local CSS token sets instead of only `primary/background/foreground`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma JSON appearance field, Tailwind CSS variables, Vitest.

---

## File Structure

- Create `src/lib/wishlist-appearance.ts`
  - Owns preset definitions, appearance types, contrast validation, legacy fallback, safe image handling, and CSS variable generation.
- Create `src/lib/wishlist-appearance-form.ts`
  - Owns conversion from `FormData` plus current JSON appearance into the canonical saved appearance object.
- Create `src/lib/__tests__/wishlist-appearance.test.ts`
  - Unit tests for resolver behavior, presets, advanced contrast fallback, banner modes, unsafe URLs, and legacy fields.
- Create `src/lib/__tests__/wishlist-appearance-form.test.ts`
  - Unit tests for profile settings form mapping and preservation of widget settings.
- Modify `src/actions/update-profile.ts`
  - Replace inline appearance construction with `buildWishlistAppearanceFromFormData`.
- Modify `src/app/[locale]/dashboard/settings/settings-form.tsx`
  - Replace always-visible color pickers with preset cards, advanced toggle, and banner display mode selector.
- Modify `src/app/[locale]/[username]/page.tsx`
  - Remove local `getWishlistStyles`; use shared resolver for token styles, banner visibility, page background, and accent color.
- Modify `src/app/[locale]/embed/[username]/page.tsx`
  - Use the same resolver for widget tokens, banner behavior, and accent colors.
- Modify `messages/en.json` and `messages/uk.json`
  - Add labels for color presets, advanced mode, warning copy, and banner display modes.
- Modify `vitest.config.ts`
  - Include `src/lib/**/*.ts` in coverage so resolver and form mapper are tracked.

---

### Task 1: Shared Appearance Resolver

**Files:**
- Create: `src/lib/wishlist-appearance.ts`
- Test: `src/lib/__tests__/wishlist-appearance.test.ts`

- [ ] **Step 1: Write failing resolver tests**

Create `src/lib/__tests__/wishlist-appearance.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  APPEARANCE_PRESETS,
  resolveWishlistAppearance,
} from "../wishlist-appearance";

describe("resolveWishlistAppearance", () => {
  it("uses the light preset for empty appearance", () => {
    const resolved = resolveWishlistAppearance({});

    expect(resolved.preset).toBe("light");
    expect(resolved.tokens).toEqual(APPEARANCE_PRESETS.light.tokens);
    expect(resolved.cssVariables["--background"]).toBe(
      APPEARANCE_PRESETS.light.tokens.background,
    );
    expect(resolved.cssVariables["--popover-foreground"]).toBe(
      APPEARANCE_PRESETS.light.tokens.popoverForeground,
    );
  });

  it.each(["light", "rose", "green", "dark", "minimal"] as const)(
    "returns a complete token set for the %s preset",
    (preset) => {
      const resolved = resolveWishlistAppearance({ colorPreset: preset });

      expect(resolved.preset).toBe(preset);
      expect(Object.keys(resolved.tokens).sort()).toEqual([
        "background",
        "border",
        "card",
        "cardForeground",
        "foreground",
        "input",
        "muted",
        "mutedForeground",
        "popover",
        "popoverForeground",
        "primary",
        "primaryForeground",
        "ring",
      ].sort());
      expect(resolved.primaryColor).toBe(APPEARANCE_PRESETS[preset].tokens.primary);
    },
  );

  it("applies advanced colors when background and text contrast is readable", () => {
    const resolved = resolveWishlistAppearance({
      colorPreset: "rose",
      advancedColorsEnabled: true,
      advancedPrimaryColor: "#2563eb",
      advancedBackgroundColor: "#ffffff",
      advancedTextColor: "#111827",
    });

    expect(resolved.advancedColorsApplied).toBe(true);
    expect(resolved.tokens.primary).toBe("#2563eb");
    expect(resolved.tokens.background).toBe("#ffffff");
    expect(resolved.tokens.foreground).toBe("#111827");
    expect(resolved.tokens.card).toBe(APPEARANCE_PRESETS.rose.tokens.card);
  });

  it("falls back to the selected preset when advanced contrast is unreadable", () => {
    const resolved = resolveWishlistAppearance({
      colorPreset: "green",
      advancedColorsEnabled: true,
      advancedPrimaryColor: "#22c55e",
      advancedBackgroundColor: "#ffffff",
      advancedTextColor: "#f8fafc",
    });

    expect(resolved.advancedColorsApplied).toBe(false);
    expect(resolved.tokens).toEqual(APPEARANCE_PRESETS.green.tokens);
  });

  it("falls back to the selected preset when advanced colors are invalid", () => {
    const resolved = resolveWishlistAppearance({
      colorPreset: "minimal",
      advancedColorsEnabled: true,
      advancedPrimaryColor: "not-a-color",
      advancedBackgroundColor: "#ffffff",
      advancedTextColor: "#111827",
    });

    expect(resolved.advancedColorsApplied).toBe(false);
    expect(resolved.tokens).toEqual(APPEARANCE_PRESETS.minimal.tokens);
  });

  it("supports legacy color fields when no preset exists", () => {
    const resolved = resolveWishlistAppearance({
      primaryColor: "#7c3aed",
      bgColor: "#ffffff",
      textColor: "#111827",
    });

    expect(resolved.advancedColorsApplied).toBe(true);
    expect(resolved.tokens.primary).toBe("#7c3aed");
    expect(resolved.tokens.background).toBe("#ffffff");
    expect(resolved.tokens.foreground).toBe("#111827");
  });

  it("ignores unsafe image URLs", () => {
    const resolved = resolveWishlistAppearance({
      bannerDisplayMode: "banner-and-page",
      bannerImage: "javascript:alert(1)",
      bgImage: "data:text/html,unsafe",
    });

    expect(resolved.banner.visible).toBe(true);
    expect(resolved.banner.style).toEqual({
      backgroundColor: APPEARANCE_PRESETS.light.tokens.primary,
    });
    expect(resolved.page.style).toEqual({ minHeight: "100vh" });
  });

  it("returns banner and page styles for banner-and-page mode", () => {
    const resolved = resolveWishlistAppearance({
      bannerDisplayMode: "banner-and-page",
      bannerImage: "https://example.com/banner.jpg",
      bgImage: "https://example.com/page.jpg",
    });

    expect(resolved.banner.visible).toBe(true);
    expect(resolved.banner.style).toMatchObject({
      backgroundImage: "url(https://example.com/banner.jpg)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
    expect(resolved.page.style).toMatchObject({
      backgroundImage: "url(https://example.com/page.jpg)",
      backgroundSize: "cover",
      backgroundAttachment: "fixed",
      minHeight: "100vh",
    });
    expect(resolved.layout.overlapBanner).toBe(true);
  });

  it("shows the banner without page image in banner-only mode", () => {
    const resolved = resolveWishlistAppearance({
      bannerDisplayMode: "banner-only",
      bannerImage: "https://example.com/banner.jpg",
      bgImage: "https://example.com/page.jpg",
    });

    expect(resolved.banner.visible).toBe(true);
    expect(resolved.page.style).toEqual({ minHeight: "100vh" });
    expect(resolved.layout.overlapBanner).toBe(true);
  });

  it("hides the banner and uses page image in page-only mode", () => {
    const resolved = resolveWishlistAppearance({
      bannerDisplayMode: "page-only",
      bannerImage: "https://example.com/banner.jpg",
      bgImage: "https://example.com/page.jpg",
    });

    expect(resolved.banner.visible).toBe(false);
    expect(resolved.page.style).toMatchObject({
      backgroundImage: "url(https://example.com/page.jpg)",
      minHeight: "100vh",
    });
    expect(resolved.layout.overlapBanner).toBe(false);
  });
});
```

- [ ] **Step 2: Run resolver tests to verify they fail**

Run:

```bash
npm test -- src/lib/__tests__/wishlist-appearance.test.ts
```

Expected: FAIL because `src/lib/wishlist-appearance.ts` does not exist.

- [ ] **Step 3: Implement the resolver**

Create `src/lib/wishlist-appearance.ts`:

```ts
import type { CSSProperties } from "react";
import { isSafeUrl } from "@/lib/utils";

export type ColorPreset = "light" | "rose" | "green" | "dark" | "minimal";
export type BannerDisplayMode = "banner-and-page" | "banner-only" | "page-only";

export type AppearanceTokens = {
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

export type WishlistAppearance = Record<
  string,
  boolean | number | string | string[] | undefined
>;

type AppearancePreset = {
  labelKey: string;
  tokens: AppearanceTokens;
};

export const APPEARANCE_PRESETS: Record<ColorPreset, AppearancePreset> = {
  light: {
    labelKey: "colorPresetLight",
    tokens: {
      primary: "#2563eb",
      primaryForeground: "#ffffff",
      background: "#f8fafc",
      foreground: "#111827",
      card: "#ffffff",
      cardForeground: "#111827",
      muted: "#e2e8f0",
      mutedForeground: "#475569",
      popover: "#ffffff",
      popoverForeground: "#111827",
      border: "#cbd5e1",
      input: "#cbd5e1",
      ring: "#2563eb",
    },
  },
  rose: {
    labelKey: "colorPresetRose",
    tokens: {
      primary: "#e11d48",
      primaryForeground: "#ffffff",
      background: "#fff1f2",
      foreground: "#3f0f1f",
      card: "#ffffff",
      cardForeground: "#3f0f1f",
      muted: "#ffe4e6",
      mutedForeground: "#9f1239",
      popover: "#ffffff",
      popoverForeground: "#3f0f1f",
      border: "#fecdd3",
      input: "#fecdd3",
      ring: "#e11d48",
    },
  },
  green: {
    labelKey: "colorPresetGreen",
    tokens: {
      primary: "#15803d",
      primaryForeground: "#ffffff",
      background: "#f0fdf4",
      foreground: "#052e16",
      card: "#ffffff",
      cardForeground: "#052e16",
      muted: "#dcfce7",
      mutedForeground: "#166534",
      popover: "#ffffff",
      popoverForeground: "#052e16",
      border: "#bbf7d0",
      input: "#bbf7d0",
      ring: "#15803d",
    },
  },
  dark: {
    labelKey: "colorPresetDark",
    tokens: {
      primary: "#a78bfa",
      primaryForeground: "#1f143d",
      background: "#111827",
      foreground: "#f9fafb",
      card: "#1f2937",
      cardForeground: "#f9fafb",
      muted: "#374151",
      mutedForeground: "#d1d5db",
      popover: "#1f2937",
      popoverForeground: "#f9fafb",
      border: "#4b5563",
      input: "#4b5563",
      ring: "#a78bfa",
    },
  },
  minimal: {
    labelKey: "colorPresetMinimal",
    tokens: {
      primary: "#111827",
      primaryForeground: "#ffffff",
      background: "#f5f5f4",
      foreground: "#1c1917",
      card: "#ffffff",
      cardForeground: "#1c1917",
      muted: "#e7e5e4",
      mutedForeground: "#57534e",
      popover: "#ffffff",
      popoverForeground: "#1c1917",
      border: "#d6d3d1",
      input: "#d6d3d1",
      ring: "#44403c",
    },
  },
};

function getString(
  appearance: WishlistAppearance,
  key: string,
  fallback = "",
) {
  const value = appearance[key];
  return typeof value === "string" ? value : fallback;
}

function getBoolean(appearance: WishlistAppearance, key: string) {
  return appearance[key] === true || appearance[key] === "true";
}

function getPreset(appearance: WishlistAppearance): ColorPreset {
  const value = getString(appearance, "colorPreset");
  return value === "rose" ||
    value === "green" ||
    value === "dark" ||
    value === "minimal" ||
    value === "light"
    ? value
    : "light";
}

function getBannerDisplayMode(
  appearance: WishlistAppearance,
): BannerDisplayMode {
  const value = getString(appearance, "bannerDisplayMode");
  return value === "banner-only" || value === "page-only"
    ? value
    : "banner-and-page";
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return undefined;
}

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const raw = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return raw <= 0.03928
      ? raw / 12.92
      : Math.pow((raw + 0.055) / 1.055, 2.4);
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function getContrastRatio(colorA: string, colorB: string) {
  const luminanceA = relativeLuminance(colorA);
  const luminanceB = relativeLuminance(colorB);
  const light = Math.max(luminanceA, luminanceB);
  const dark = Math.min(luminanceA, luminanceB);

  return (light + 0.05) / (dark + 0.05);
}

function getAdvancedTokens(
  appearance: WishlistAppearance,
  presetTokens: AppearanceTokens,
) {
  const primary = normalizeHexColor(
    getString(appearance, "advancedPrimaryColor"),
  );
  const background = normalizeHexColor(
    getString(appearance, "advancedBackgroundColor"),
  );
  const foreground = normalizeHexColor(
    getString(appearance, "advancedTextColor"),
  );

  if (!primary || !background || !foreground) {
    return undefined;
  }

  if (getContrastRatio(background, foreground) < 4.5) {
    return undefined;
  }

  return {
    ...presetTokens,
    primary,
    background,
    foreground,
  };
}

function getLegacyTokens(
  appearance: WishlistAppearance,
  presetTokens: AppearanceTokens,
) {
  const primary = normalizeHexColor(getString(appearance, "primaryColor"));
  const background = normalizeHexColor(getString(appearance, "bgColor"));
  const foreground = normalizeHexColor(getString(appearance, "textColor"));

  if (!primary || !background || !foreground) {
    return undefined;
  }

  if (getContrastRatio(background, foreground) < 4.5) {
    return undefined;
  }

  return {
    ...presetTokens,
    primary,
    background,
    foreground,
  };
}

function toCssVariables(tokens: AppearanceTokens) {
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
  } as CSSProperties;
}

function getBannerStyle(
  appearance: WishlistAppearance,
  tokens: AppearanceTokens,
): CSSProperties {
  const bannerImage = getString(appearance, "bannerImage");

  if (isSafeUrl(bannerImage)) {
    return {
      backgroundImage: `url(${bannerImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  return { backgroundColor: tokens.primary };
}

function getPageStyle(
  appearance: WishlistAppearance,
  displayMode: BannerDisplayMode,
) {
  const bgImage = getString(appearance, "bgImage");

  if (displayMode !== "banner-only" && isSafeUrl(bgImage)) {
    return {
      backgroundImage: `url(${bgImage})`,
      backgroundSize: "cover",
      backgroundAttachment: "fixed",
      minHeight: "100vh",
    } as CSSProperties;
  }

  return { minHeight: "100vh" } as CSSProperties;
}

export function resolveWishlistAppearance(appearance: WishlistAppearance = {}) {
  const preset = getPreset(appearance);
  const displayMode = getBannerDisplayMode(appearance);
  const presetTokens = APPEARANCE_PRESETS[preset].tokens;
  const advancedTokens = getBoolean(appearance, "advancedColorsEnabled")
    ? getAdvancedTokens(appearance, presetTokens)
    : undefined;
  const legacyTokens = !getString(appearance, "colorPreset")
    ? getLegacyTokens(appearance, presetTokens)
    : undefined;
  const tokens = advancedTokens || legacyTokens || presetTokens;
  const bannerVisible = displayMode !== "page-only";

  return {
    preset,
    displayMode,
    tokens,
    cssVariables: toCssVariables(tokens),
    primaryColor: tokens.primary,
    advancedColorsApplied: Boolean(advancedTokens || legacyTokens),
    banner: {
      visible: bannerVisible,
      style: bannerVisible ? getBannerStyle(appearance, tokens) : {},
    },
    page: {
      style: getPageStyle(appearance, displayMode),
    },
    layout: {
      overlapBanner: bannerVisible,
    },
  };
}
```

- [ ] **Step 4: Run resolver tests to verify they pass**

Run:

```bash
npm test -- src/lib/__tests__/wishlist-appearance.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit resolver**

Run:

```bash
git add src/lib/wishlist-appearance.ts src/lib/__tests__/wishlist-appearance.test.ts
git commit -m "Add wishlist appearance resolver"
```

---

### Task 2: Profile Appearance Form Mapping

**Files:**
- Create: `src/lib/wishlist-appearance-form.ts`
- Test: `src/lib/__tests__/wishlist-appearance-form.test.ts`
- Modify: `src/actions/update-profile.ts`

- [ ] **Step 1: Write failing form mapper tests**

Create `src/lib/__tests__/wishlist-appearance-form.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildWishlistAppearanceFromFormData } from "../wishlist-appearance-form";

function form(values: Record<string, string | string[]>) {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item));
      return;
    }
    formData.set(key, value);
  });

  return formData;
}

describe("buildWishlistAppearanceFromFormData", () => {
  it("writes canonical preset and banner settings while preserving widget settings", () => {
    const result = buildWishlistAppearanceFromFormData(
      {
        widgetLayout: "list",
        widgetItemSize: 130,
        primaryColor: "#000000",
        bgColor: "#ffffff",
        textColor: "#111111",
      },
      form({
        bgImage: "https://example.com/bg.jpg",
        bannerImage: "https://example.com/banner.jpg",
        bannerDisplayMode: "page-only",
        welcomeMessage: "Hello",
        itemBorder: "rounded-lg border-dashed",
        themeMode: "system",
        colorPreset: "rose",
        advancedPrimaryColor: "#2563eb",
        advancedBackgroundColor: "#ffffff",
        advancedTextColor: "#111827",
        font: "font-sans",
        favoriteCurrencies: ["UAH", "EUR"],
      }),
    );

    expect(result).toMatchObject({
      widgetLayout: "list",
      widgetItemSize: 130,
      bgImage: "https://example.com/bg.jpg",
      bannerImage: "https://example.com/banner.jpg",
      bannerDisplayMode: "page-only",
      welcomeMessage: "Hello",
      itemBorder: "rounded-lg border-dashed",
      themeMode: "system",
      colorPreset: "rose",
      advancedColorsEnabled: false,
      advancedPrimaryColor: "#2563eb",
      advancedBackgroundColor: "#ffffff",
      advancedTextColor: "#111827",
      font: "font-sans",
      favoriteCurrencies: ["UAH", "EUR"],
    });
    expect(result.primaryColor).toBeUndefined();
    expect(result.bgColor).toBeUndefined();
    expect(result.textColor).toBeUndefined();
  });

  it("enables advanced colors only when the toggle is submitted", () => {
    const result = buildWishlistAppearanceFromFormData(
      {},
      form({
        colorPreset: "green",
        advancedColorsEnabled: "true",
        advancedPrimaryColor: "#15803d",
        advancedBackgroundColor: "#ffffff",
        advancedTextColor: "#111827",
      }),
    );

    expect(result.advancedColorsEnabled).toBe(true);
    expect(result.colorPreset).toBe("green");
  });

  it("normalizes unknown preset and display mode to safe defaults", () => {
    const result = buildWishlistAppearanceFromFormData(
      {},
      form({
        colorPreset: "neon",
        bannerDisplayMode: "float",
      }),
    );

    expect(result.colorPreset).toBe("light");
    expect(result.bannerDisplayMode).toBe("banner-and-page");
  });

  it("defaults favorite currencies to UAH when none are submitted", () => {
    const result = buildWishlistAppearanceFromFormData({}, form({}));

    expect(result.favoriteCurrencies).toEqual(["UAH"]);
  });
});
```

- [ ] **Step 2: Run form mapper tests to verify they fail**

Run:

```bash
npm test -- src/lib/__tests__/wishlist-appearance-form.test.ts
```

Expected: FAIL because `src/lib/wishlist-appearance-form.ts` does not exist.

- [ ] **Step 3: Implement form mapper**

Create `src/lib/wishlist-appearance-form.ts`:

```ts
import type {
  BannerDisplayMode,
  ColorPreset,
  WishlistAppearance,
} from "@/lib/wishlist-appearance";

const COLOR_PRESETS: ColorPreset[] = [
  "light",
  "rose",
  "green",
  "dark",
  "minimal",
];

const BANNER_DISPLAY_MODES: BannerDisplayMode[] = [
  "banner-and-page",
  "banner-only",
  "page-only",
];

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function normalizeColorPreset(value: string): ColorPreset {
  return COLOR_PRESETS.includes(value as ColorPreset)
    ? (value as ColorPreset)
    : "light";
}

function normalizeBannerDisplayMode(value: string): BannerDisplayMode {
  return BANNER_DISPLAY_MODES.includes(value as BannerDisplayMode)
    ? (value as BannerDisplayMode)
    : "banner-and-page";
}

export function buildWishlistAppearanceFromFormData(
  currentAppearance: WishlistAppearance,
  formData: FormData,
) {
  const favoriteCurrencies = formData.getAll("favoriteCurrencies");
  const advancedColorsEnabled =
    formString(formData, "advancedColorsEnabled") === "true";

  const {
    primaryColor: _primaryColor,
    bgColor: _bgColor,
    textColor: _textColor,
    ...appearanceWithoutLegacyColors
  } = currentAppearance;

  return {
    ...appearanceWithoutLegacyColors,
    bgImage: formString(formData, "bgImage"),
    bannerImage: formString(formData, "bannerImage"),
    bannerDisplayMode: normalizeBannerDisplayMode(
      formString(formData, "bannerDisplayMode"),
    ),
    welcomeMessage: formString(formData, "welcomeMessage"),
    itemBorder: formString(formData, "itemBorder"),
    themeMode: formString(formData, "themeMode") || "system",
    colorPreset: normalizeColorPreset(formString(formData, "colorPreset")),
    advancedColorsEnabled,
    advancedPrimaryColor: formString(formData, "advancedPrimaryColor"),
    advancedBackgroundColor: formString(formData, "advancedBackgroundColor"),
    advancedTextColor: formString(formData, "advancedTextColor"),
    font: formString(formData, "font") || "font-sans",
    favoriteCurrencies:
      favoriteCurrencies.length > 0
        ? favoriteCurrencies.filter(
            (value): value is string => typeof value === "string",
          )
        : ["UAH"],
  };
}
```

- [ ] **Step 4: Run form mapper tests to verify they pass**

Run:

```bash
npm test -- src/lib/__tests__/wishlist-appearance-form.test.ts
```

Expected: PASS.

- [ ] **Step 5: Update profile action to use form mapper**

Modify `src/actions/update-profile.ts`:

```ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildWishlistAppearanceFromFormData } from "@/lib/wishlist-appearance-form";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Не авторизований");
  }

  const name = formData.get("name") as string;
  const username = formData.get("username") as string;

  if (username) {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return { error: "Цей нікнейм вже зайнятий" };
    }
  }

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
    select: { appearance: true },
  });
  const currentAppearance =
    wishlist?.appearance &&
    typeof wishlist.appearance === "object" &&
    !Array.isArray(wishlist.appearance)
      ? wishlist.appearance
      : {};

  const appearance = buildWishlistAppearanceFromFormData(
    currentAppearance,
    formData,
  );

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      username,
      wishlist: {
        update: {
          appearance,
        },
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/[locale]/[username]", "page");
  revalidatePath("/[locale]/embed/[username]", "page");

  return { success: true };
}
```

- [ ] **Step 6: Run mapper tests and TypeScript/lint check**

Run:

```bash
npm test -- src/lib/__tests__/wishlist-appearance-form.test.ts
npm run lint
```

Expected: tests PASS; lint has no new errors from `update-profile.ts`.

- [ ] **Step 7: Commit form mapper**

Run:

```bash
git add src/lib/wishlist-appearance-form.ts src/lib/__tests__/wishlist-appearance-form.test.ts src/actions/update-profile.ts
git commit -m "Normalize wishlist appearance form settings"
```

---

### Task 3: Settings Form Presets And Banner Mode UI

**Files:**
- Modify: `src/app/[locale]/dashboard/settings/settings-form.tsx`
- Modify: `messages/en.json`
- Modify: `messages/uk.json`

- [ ] **Step 1: Add translation keys**

In `messages/en.json`, add these keys under `Settings`:

```json
"colorSchemeLabel": "Color scheme",
"colorPresetLight": "Light",
"colorPresetRose": "Rose",
"colorPresetGreen": "Green",
"colorPresetDark": "Dark",
"colorPresetMinimal": "Minimal",
"advancedColorsLabel": "Manual color controls",
"advancedColorsHelp": "If the manual background and text colors are not readable, the selected preset will be used.",
"advancedPrimaryColorLabel": "Manual primary color",
"advancedBackgroundColorLabel": "Manual background color",
"advancedTextColorLabel": "Manual text color",
"bannerDisplayModeLabel": "Background display",
"bannerDisplayModeBoth": "Banner and page background",
"bannerDisplayModeBannerOnly": "Banner only",
"bannerDisplayModePageOnly": "Page background only"
```

In `messages/uk.json`, add these keys under `Settings`:

```json
"colorSchemeLabel": "Кольорова гама",
"colorPresetLight": "Світла",
"colorPresetRose": "Рожева",
"colorPresetGreen": "Зелена",
"colorPresetDark": "Темна",
"colorPresetMinimal": "Мінімальна",
"advancedColorsLabel": "Ручне налаштування кольорів",
"advancedColorsHelp": "Якщо ручні кольори фону й тексту нечитабельні, буде використано обраний пресет.",
"advancedPrimaryColorLabel": "Ручний основний колір",
"advancedBackgroundColorLabel": "Ручний колір фону",
"advancedTextColorLabel": "Ручний колір тексту",
"bannerDisplayModeLabel": "Відображення фону",
"bannerDisplayModeBoth": "Банер і фон сторінки",
"bannerDisplayModeBannerOnly": "Лише банер",
"bannerDisplayModePageOnly": "Лише фон сторінки"
```

- [ ] **Step 2: Update settings form imports and state**

In `src/app/[locale]/dashboard/settings/settings-form.tsx`, add imports:

```ts
import {
  APPEARANCE_PRESETS,
  type BannerDisplayMode,
  type ColorPreset,
} from "@/lib/wishlist-appearance";
```

Add constants near `LEGACY_BORDER_DEFAULTS`:

```ts
const COLOR_PRESET_OPTIONS: ColorPreset[] = [
  "light",
  "rose",
  "green",
  "dark",
  "minimal",
];

const BANNER_DISPLAY_MODE_OPTIONS: BannerDisplayMode[] = [
  "banner-and-page",
  "banner-only",
  "page-only",
];

const BANNER_DISPLAY_MODE_LABELS: Record<BannerDisplayMode, string> = {
  "banner-and-page": "bannerDisplayModeBoth",
  "banner-only": "bannerDisplayModeBannerOnly",
  "page-only": "bannerDisplayModePageOnly",
};
```

Replace the current raw appearance typing:

```ts
const rawAppearance =
  (user.wishlist?.appearance as Record<string, string | string[]>) || {};
const appearance: Record<string, string | string[]> = {
```

with:

```ts
type SettingsAppearance = Record<
  string,
  boolean | number | string | string[] | undefined
>;

const rawAppearance =
  (user.wishlist?.appearance as SettingsAppearance) || {};
const appearance: SettingsAppearance = {
```

Add state after `themeMode`:

```ts
const initialColorPreset =
  typeof appearance.colorPreset === "string" &&
  COLOR_PRESET_OPTIONS.includes(appearance.colorPreset as ColorPreset)
    ? (appearance.colorPreset as ColorPreset)
    : "light";
const initialBannerDisplayMode =
  typeof appearance.bannerDisplayMode === "string" &&
  BANNER_DISPLAY_MODE_OPTIONS.includes(
    appearance.bannerDisplayMode as BannerDisplayMode,
  )
    ? (appearance.bannerDisplayMode as BannerDisplayMode)
    : "banner-and-page";
const [colorPreset, setColorPreset] =
  useState<ColorPreset>(initialColorPreset);
const [advancedColorsEnabled, setAdvancedColorsEnabled] = useState(
  appearance.advancedColorsEnabled === true ||
    appearance.advancedColorsEnabled === "true",
);
const [bannerDisplayMode, setBannerDisplayMode] =
  useState<BannerDisplayMode>(initialBannerDisplayMode);
```

- [ ] **Step 3: Replace color picker grid with preset and advanced UI**

Replace the existing grid containing `primaryColor`, `textColor`, `bgColor`, and `itemBorder` with this block followed by the existing item border select:

```tsx
<div className="space-y-3">
  <Label>{t("colorSchemeLabel")}</Label>
  <input type="hidden" name="colorPreset" value={colorPreset} />
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {COLOR_PRESET_OPTIONS.map((preset) => {
      const presetTokens = APPEARANCE_PRESETS[preset].tokens;
      const isSelected = colorPreset === preset;

      return (
        <button
          key={preset}
          type="button"
          onClick={() => setColorPreset(preset)}
          className={`rounded-md border p-3 text-left transition-colors ${
            isSelected
              ? "border-primary ring-2 ring-primary/30"
              : "border-input hover:bg-muted/50"
          }`}
        >
          <span className="block text-sm font-medium">
            {t(APPEARANCE_PRESETS[preset].labelKey)}
          </span>
          <span className="mt-3 flex gap-1">
            {[
              presetTokens.background,
              presetTokens.card,
              presetTokens.primary,
              presetTokens.foreground,
            ].map((color) => (
              <span
                key={color}
                className="h-5 w-8 rounded border"
                style={{ backgroundColor: color }}
              />
            ))}
          </span>
        </button>
      );
    })}
  </div>
</div>

<div className="space-y-2 rounded-md border p-3">
  <label className="flex items-center gap-2 text-sm font-medium">
    <input
      type="checkbox"
      checked={advancedColorsEnabled}
      onChange={(event) => setAdvancedColorsEnabled(event.target.checked)}
      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
    />
    {t("advancedColorsLabel")}
  </label>
  <input
    type="hidden"
    name="advancedColorsEnabled"
    value={advancedColorsEnabled ? "true" : "false"}
  />
  <p className="text-xs text-muted-foreground">
    {t("advancedColorsHelp")}
  </p>

  {advancedColorsEnabled && (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
      <div className="space-y-2">
        <Label htmlFor="advancedPrimaryColor">
          {t("advancedPrimaryColorLabel")}
        </Label>
        <Input
          id="advancedPrimaryColor"
          name="advancedPrimaryColor"
          type="color"
          defaultValue={
            typeof appearance.advancedPrimaryColor === "string"
              ? appearance.advancedPrimaryColor
              : typeof appearance.primaryColor === "string"
                ? appearance.primaryColor
                : "#2563eb"
          }
          className="h-10 w-full p-1"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="advancedBackgroundColor">
          {t("advancedBackgroundColorLabel")}
        </Label>
        <Input
          id="advancedBackgroundColor"
          name="advancedBackgroundColor"
          type="color"
          defaultValue={
            typeof appearance.advancedBackgroundColor === "string"
              ? appearance.advancedBackgroundColor
              : typeof appearance.bgColor === "string"
                ? appearance.bgColor
                : "#ffffff"
          }
          className="h-10 w-full p-1"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="advancedTextColor">
          {t("advancedTextColorLabel")}
        </Label>
        <Input
          id="advancedTextColor"
          name="advancedTextColor"
          type="color"
          defaultValue={
            typeof appearance.advancedTextColor === "string"
              ? appearance.advancedTextColor
              : typeof appearance.textColor === "string"
                ? appearance.textColor
                : "#111827"
          }
          className="h-10 w-full p-1"
        />
      </div>
    </div>
  )}
</div>

<div className="space-y-2">
  <Label htmlFor="bannerDisplayMode">{t("bannerDisplayModeLabel")}</Label>
  <select
    id="bannerDisplayMode"
    name="bannerDisplayMode"
    value={bannerDisplayMode}
    onChange={(event) =>
      setBannerDisplayMode(event.target.value as BannerDisplayMode)
    }
    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {BANNER_DISPLAY_MODE_OPTIONS.map((mode) => (
      <option key={mode} value={mode}>
        {t(BANNER_DISPLAY_MODE_LABELS[mode])}
      </option>
    ))}
  </select>
</div>
```

Keep the existing `itemBorder` select after this block.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or no new errors in `settings-form.tsx` and message JSON.

- [ ] **Step 5: Commit settings UI**

Run:

```bash
git add src/app/[locale]/dashboard/settings/settings-form.tsx messages/en.json messages/uk.json
git commit -m "Add wishlist color preset settings"
```

---

### Task 4: Public Wishlist Page Rendering

**Files:**
- Modify: `src/app/[locale]/[username]/page.tsx`

- [ ] **Step 1: Remove local style resolver and import shared resolver**

In `src/app/[locale]/[username]/page.tsx`, remove `isSafeUrl` from the resolver use only if still needed for images and links. Keep `isSafeUrl` for user/item image and item link checks.

Add:

```ts
import { resolveWishlistAppearance } from "@/lib/wishlist-appearance";
```

Delete the local `getWishlistStyles` function.

- [ ] **Step 2: Replace style resolution usage**

Replace:

```ts
const { bannerStyle, bgStyle, themeStyle } = getWishlistStyles(appearance);
const primaryColor = getAppearanceString(appearance, "primaryColor", "#000000");
```

with:

```ts
const resolvedAppearance = resolveWishlistAppearance(appearance);
const primaryColor = resolvedAppearance.primaryColor;
```

Replace the root style:

```tsx
style={{ ...bgStyle, ...themeStyle }}
```

with:

```tsx
style={{
  ...resolvedAppearance.page.style,
  ...resolvedAppearance.cssVariables,
}}
```

- [ ] **Step 3: Render banner conditionally**

Replace the always-rendered banner block with:

```tsx
{resolvedAppearance.banner.visible && (
  <div
    className="h-48 md:h-64 w-full relative border-b"
    style={resolvedAppearance.banner.style}
  >
    <div className="absolute inset-0 bg-black/10" />
  </div>
)}
```

Replace the main container class with conditional overlap:

```tsx
<div
  className={`container mx-auto px-4 relative z-10 bg-background/85 backdrop-blur-sm rounded-xl min-h-[calc(100vh-16rem)] shadow-lg ${
    resolvedAppearance.layout.overlapBanner ? "-mt-20 py-10" : "mt-8 py-10"
  }`}
>
```

- [ ] **Step 4: Ensure local token coverage**

Update inline uses of `primaryColor` to keep behavior:

```tsx
style={{
  borderColor: `${primaryColor}30`,
}}
```

```tsx
style={{
  backgroundColor: primaryColor,
  color: resolvedAppearance.tokens.primaryForeground,
}}
```

```tsx
style={{
  color: primaryColor,
}}
```

```tsx
style={{
  borderColor: primaryColor,
  color: primaryColor,
}}
```

- [ ] **Step 5: Run tests and lint**

Run:

```bash
npm test -- src/lib/__tests__/wishlist-appearance.test.ts
npm run lint
```

Expected: tests PASS; lint has no new errors in the public page.

- [ ] **Step 6: Commit public page rendering**

Run:

```bash
git add src/app/[locale]/[username]/page.tsx
git commit -m "Apply resolved appearance to wishlist page"
```

---

### Task 5: Embed Widget Rendering

**Files:**
- Modify: `src/app/[locale]/embed/[username]/page.tsx`

- [ ] **Step 1: Import shared resolver and remove local color constants**

Add:

```ts
import { resolveWishlistAppearance } from "@/lib/wishlist-appearance";
```

Replace:

```ts
const primaryColor = getAppearanceString(appearance, "primaryColor", "#000000");
const bgColor = getAppearanceString(appearance, "bgColor", "#ffffff");
const textColor = getAppearanceString(appearance, "textColor", "#111827");
```

with:

```ts
const resolvedAppearance = resolveWishlistAppearance(appearance);
const primaryColor = resolvedAppearance.primaryColor;
```

- [ ] **Step 2: Replace widget theme style**

Replace `themeStyle` with:

```ts
const themeStyle = {
  ...resolvedAppearance.cssVariables,
  "--widget-item-size": `${widgetItemSize}px`,
  ...resolvedAppearance.page.style,
  color: resolvedAppearance.tokens.foreground,
} as CSSProperties;
```

Delete the local `bannerImage` and `bannerStyle` constants.

- [ ] **Step 3: Render widget banner conditionally**

Replace the always-rendered banner block with:

```tsx
{resolvedAppearance.banner.visible && (
  <div
    className="relative h-28 w-full border-b"
    style={resolvedAppearance.banner.style}
  >
    <div className="absolute inset-0 bg-black/10" />
  </div>
)}
```

Update profile section class:

```tsx
<div
  className={`relative flex flex-col items-center text-center ${
    resolvedAppearance.layout.overlapBanner ? "-mt-12" : "pt-4"
  }`}
>
```

- [ ] **Step 4: Use resolved foregrounds for inline accents**

Update price and link accents:

```tsx
style={{ color: primaryColor }}
```

Update item border:

```tsx
style={{ borderColor: `${primaryColor}30` }}
```

Keep these inline styles because they are simple accents and already use resolver output.

- [ ] **Step 5: Run resolver tests and lint**

Run:

```bash
npm test -- src/lib/__tests__/wishlist-appearance.test.ts
npm run lint
```

Expected: tests PASS; lint has no new errors in the embed page.

- [ ] **Step 6: Commit widget rendering**

Run:

```bash
git add src/app/[locale]/embed/[username]/page.tsx
git commit -m "Apply resolved appearance to embed widget"
```

---

### Task 6: Vitest Coverage And Full Verification

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Expand coverage include paths**

Modify `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/actions/fetch-metadata.ts', 'src/lib/**/*.ts'],
    },
  },
})
```

- [ ] **Step 2: Run all tests**

Run:

```bash
npm test
```

Expected: all Vitest suites PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: Next.js build succeeds.

- [ ] **Step 5: Start or reuse local dev server**

If no dev server is running:

```bash
npm run dev -- --port 3000
```

Expected: local app available at `http://localhost:3000`.

- [ ] **Step 6: Inspect public page and widget**

Open:

```text
http://localhost:3000/uk/lody
http://localhost:3000/uk/embed/lody
```

Expected on public page:

- page renders without errors.
- filters and native selects are readable.
- cards, muted text, borders, and action buttons are readable.
- banner overlap exists for `banner-and-page` and `banner-only`.
- no overlap is used for `page-only`.

Expected on embed:

- widget uses same preset colors as the public page.
- footer, item cards, item names, prices, and borders are readable.
- banner visibility follows `bannerDisplayMode`.

- [ ] **Step 7: Commit verification config**

Run:

```bash
git add vitest.config.ts
git commit -m "Track appearance resolver coverage"
```

---

### Task 7: Final Review

**Files:**
- Read-only review of all touched files.

- [ ] **Step 1: Check final git status**

Run:

```bash
git status --short
```

Expected: clean working tree.

- [ ] **Step 2: Review final diff from main development base**

Run:

```bash
git log --oneline -6
```

Expected: commits are focused and ordered:

- design spec
- resolver
- form mapper
- settings UI
- public page rendering
- widget rendering
- coverage config

- [ ] **Step 3: Summarize implementation**

Prepare a final summary containing:

- appearance presets implemented.
- advanced color validation behavior.
- banner display modes.
- shared resolver use on public page and embed widget.
- test, lint, and build results.
