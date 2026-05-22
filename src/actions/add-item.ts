"use server";

import { getAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { normalizeWishlistItemIntake } from "@/lib/wishlist-item-intake";
import type { WishlistItemIntakeInput } from "@/lib/wishlist-item-intake";
import { getRepository } from "@/lib/repository";
import { revalidatePath } from "next/cache";

export type AddItemData = WishlistItemIntakeInput;

export async function addItem(data: AddItemData) {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const intake = normalizeWishlistItemIntake(data);
        await getRepository().require({ type: "owned-wishlist", wishlistId: intake.wishlistId, userId });
        const item = await getRepository().execute({ type: "add-item", userId, item: intake });

        revalidatePath('/[locale]/[username]', 'page');

        return { success: true, item };
    } catch (error) {
        console.error('Error adding item:', error);
        return { success: false, error: 'Failed to add item' };
    }
}
