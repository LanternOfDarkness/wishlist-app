"use server";

import { requireAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { getRepository } from "@/lib/repository";
import { revalidatePath } from "next/cache";

export async function updateWidgetItems(itemId: string, showInWidget: boolean) {
    const userId = await requireAuthenticatedUserId();
    await getRepository().require({ type: "owned-item", itemId, userId });

    if (showInWidget) {
        const count = await getRepository().load({ type: "widget-item-count", userId });

        if (count >= 5) {
            return { error: "Maximum 5 items can be shown in widget" };
        }
    }

    await getRepository().execute({
        type: "update-widget-item-visibility",
        itemId,
        showInWidget,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/[locale]/embed/[username]", "page");

    return { success: true };
}
