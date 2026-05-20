"use server";

import {
  requireAuthenticatedUserId,
  requireOwnedWishlistAppearance,
} from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type WidgetLayout = "grid" | "list";

interface WidgetSettingsInput {
  layout?: WidgetLayout;
  itemSize?: number;
}

function normalizeItemSize(itemSize: number | undefined) {
  if (!itemSize) {
    return undefined;
  }

  return Math.min(Math.max(Math.round(itemSize), 70), 160);
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
          ? { widgetItemSize: normalizeItemSize(settings.itemSize) }
          : {}),
      },
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/[locale]/embed/[username]", "page");

  return { success: true };
}
