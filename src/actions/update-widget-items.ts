"use server";

import { requireAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { getRepository } from "@/lib/repository";
import { failure, success, type ActionResult } from "@/lib/action-result";
import { REVALIDATION_PATHS } from "@/lib/revalidate-paths";
import { revalidatePath } from "next/cache";

export async function updateWidgetItems(itemId: string, showInWidget: boolean): Promise<ActionResult> {
    const userId = await requireAuthenticatedUserId();
    await getRepository().require({ type: "owned-item", itemId, userId });

    if (showInWidget) {
        const count = await getRepository().load({ type: "widget-item-count", userId });

        if (count >= 5) {
            return failure("Maximum 5 items can be shown in widget");
        }
    }

    await getRepository().execute({
        type: "update-widget-item-visibility",
        itemId,
        showInWidget,
    });

    revalidatePath(REVALIDATION_PATHS.dashboardSettings.path, REVALIDATION_PATHS.dashboardSettings.type);
    revalidatePath(REVALIDATION_PATHS.embedPage.path, REVALIDATION_PATHS.embedPage.type);

    return success();
}
