"use server";

import { requireAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { getRepository } from "@/lib/repository";
import {
  normalizeWidgetItemSize,
  type WidgetLayout,
} from "@/lib/wishlist-settings-state";
import { success, type ActionResult } from "@/lib/action-result";
import { REVALIDATION_PATHS } from "@/lib/revalidate-paths";
import { revalidatePath } from "next/cache";

interface WidgetSettingsInput {
  layout?: WidgetLayout;
  itemSize?: number;
}

export async function updateWidgetSettings(settings: WidgetSettingsInput): Promise<ActionResult> {
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

  revalidatePath(REVALIDATION_PATHS.dashboardSettings.path, REVALIDATION_PATHS.dashboardSettings.type);
  revalidatePath(REVALIDATION_PATHS.embedPage.path, REVALIDATION_PATHS.embedPage.type);

  return success();
}
