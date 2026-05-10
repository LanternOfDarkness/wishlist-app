"use server";

import { auth } from "@/auth";
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
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { wishlist: true },
  });

  if (!user?.wishlist) {
    throw new Error("Wishlist not found");
  }

  const currentAppearance =
    user.wishlist.appearance &&
    typeof user.wishlist.appearance === "object" &&
    !Array.isArray(user.wishlist.appearance)
      ? user.wishlist.appearance
      : {};

  await prisma.wishlist.update({
    where: { id: user.wishlist.id },
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
