"use server";

import {
    requireAuthenticatedUserId,
} from "@/lib/wishlist-command-context";
import {
    updateWishlistItemFromIntake,
} from "@/lib/wishlist-item-intake-command";
import type { WishlistItemIntakeInput } from "@/lib/wishlist-item-intake";
import { revalidatePath } from "next/cache";

export type UpdateItemData = Omit<WishlistItemIntakeInput, "wishlistId">;

export async function updateItem(itemId: string, data: UpdateItemData) {
    try {
        const userId = await requireAuthenticatedUserId();
        const item = await updateWishlistItemFromIntake(itemId, data, userId);

        revalidatePath('/[locale]/[username]', 'page');

        return { success: true, item };
    } catch (error) {
        console.error('Error updating item:', error);
        return { success: false, error: 'Failed to update item' };
    }
}
