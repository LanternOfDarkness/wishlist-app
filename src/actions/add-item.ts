"use server";

import { getAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { normalizeWishlistItemIntake } from "@/lib/wishlist-item-intake";
import type { WishlistItemIntakeInput } from "@/lib/wishlist-item-intake";
import { getRepository } from "@/lib/repository";
import { failure, success, type ActionResult } from "@/lib/action-result";
import { REVALIDATION_PATHS } from "@/lib/revalidate-paths";
import { revalidatePath } from "next/cache";

export type AddItemData = WishlistItemIntakeInput;

export async function addItem(data: AddItemData): Promise<ActionResult<unknown>> {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
        return failure("Unauthorized");
    }

    try {
        const intake = normalizeWishlistItemIntake(data);
        await getRepository().require({ type: "owned-wishlist", wishlistId: intake.wishlistId, userId });
        const item = await getRepository().execute({ type: "add-item", userId, item: intake });

        revalidatePath(REVALIDATION_PATHS.wishlistPage.path, REVALIDATION_PATHS.wishlistPage.type);
        return success(item) as ActionResult;
    } catch (error) {
        console.error("Error adding item:", error);
        return failure("Failed to add item");
    }
}
