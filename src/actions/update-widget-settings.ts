"use server";

import {
  requireAuthenticatedUserId,
  requireOwnedWishlistAppearance,
} from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";
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
  const wishlist = await requireOwnedWishlistAppearance(userId);

  const currentAppearance =
    wishlist.appearance &&
    typeof wishlist.appearance === "object" &&
    !Array.isArray(wishlist.appearance)
      ? wishlist.appearance
      : {};

  await prisma.wishlist.update({
    where: { id: wishlist.id },
    data: {
      appearance: {
        ...currentAppearance,
        ...(settings.layout ? { widgetLayout: settings.layout } : {}),
        ...(settings.itemSize
          ? { widgetItemSize: normalizeWidgetItemSize(settings.itemSize) }
          : {}),
      },
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/[locale]/embed/[username]", "page");

  return { success: true };
}
