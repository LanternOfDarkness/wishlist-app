"use server";

import {
    countSelectedWidgetItems,
    requireAuthenticatedUserId,
    requireOwnedWishlistItem,
} from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateWidgetItems(itemId: string, showInWidget: boolean) {
    const userId = await requireAuthenticatedUserId();
    await requireOwnedWishlistItem(itemId, userId);

    if (showInWidget) {
        const count = await countSelectedWidgetItems(userId);

        if (count >= 5) {
            return { error: "Maximum 5 items can be shown in widget" };
        }
    }

    await prisma.item.update({
        where: { id: itemId },
        data: { showInWidget }
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/[locale]/embed/[username]", "page");

    return { success: true };
}
