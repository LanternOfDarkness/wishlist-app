import type { JsonValue } from "@prisma/client/runtime/library";

import {
  getWishlistAppearanceSettingsState,
  getWishlistWidgetSettingsState as getWidgetSettingsState,
} from "./wishlist-appearance";

export {
  BANNER_DISPLAY_MODE_OPTIONS,
  BANNER_MODE_LABELS,
  COLOR_PRESET_OPTIONS,
  FONT_OPTIONS,
  ITEM_BORDER_OPTIONS,
  normalizeWishlistWidgetItemSize as normalizeWidgetItemSize,
  shouldUseDarkTheme,
} from "./wishlist-appearance";
export type {
  BannerDisplayMode,
  ColorPreset,
  ThemeMode,
  WidgetLayout,
} from "./wishlist-appearance";

export function getWishlistSettingsState(appearance: JsonValue | undefined) {
  return getWishlistAppearanceSettingsState(appearance);
}

export function getWishlistWidgetSettingsState(
  appearance: JsonValue | undefined,
) {
  return getWidgetSettingsState(appearance);
}
