"use server";

import { requireAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { getRepository } from "@/lib/repository";
import {
  normalizeWidgetItemSize,
  type WidgetLayout,
} from "@/lib/wishlist-settings-state";
import { revalidatePath } from "next/cache";

interface WidgetSettingsInput {
  layout?: WidgetLayout;
  itemSize?: number;
}

export async function updateWidgetSettings(settings: WidgetSettingsInput) {
  const userId = await requireAuthenticatedUserId();
  const wishlist = await getRepository().require({ type: "wishlist-appearance", userId });

  const currentAppearance = wishlist.appearance;

  await getRepository().execute({
    type: "update-widget-settings",
    wishlistId: wishlist.id,
    appearance: {
      ...currentAppearance,
      ...(settings.layout ? { widgetLayout: settings.layout } : {}),
      ...(settings.itemSize
        ? { widgetItemSize: normalizeWidgetItemSize(settings.itemSize) }
        : {}),
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/[locale]/embed/[username]", "page");

  return { success: true };
}
