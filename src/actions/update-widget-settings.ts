"use server";

import { getRepository } from "@/lib/repository";
import { normalizeWidgetItemSize, type WidgetLayout } from "@/lib/wishlist-appearance";
import {
  requireAuthenticatedUserId,
  requireOwned,
  wishlistCommand,
} from "@/lib/wishlist-command";

interface WidgetSettingsInput {
  layout?: WidgetLayout;
  itemSize?: number;
}

export const updateWidgetSettings = wishlistCommand(
  async (settings: WidgetSettingsInput) => {
    const userId = await requireAuthenticatedUserId();
    const wishlist = await requireOwned(
      getRepository().require({
        type: "wishlist-appearance",
        userId,
        message: "Wishlist not found",
      }),
    );

    await getRepository().execute({
      type: "update-widget-settings",
      wishlistId: wishlist.id,
      appearance: {
        ...wishlist.appearance,
        ...(settings.layout ? { widgetLayout: settings.layout } : {}),
        ...(settings.itemSize
          ? { widgetItemSize: normalizeWidgetItemSize(settings.itemSize) }
          : {}),
      },
    });
  },
  { revalidate: ["dashboardSettings", "embedPage"] },
);
