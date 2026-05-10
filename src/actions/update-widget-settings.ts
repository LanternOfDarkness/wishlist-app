"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type WidgetLayout = "grid" | "list";

export async function updateWidgetSettings(layout: WidgetLayout) {
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
        widgetLayout: layout,
      },
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/[locale]/embed/[username]", "page");

  return { success: true };
}
