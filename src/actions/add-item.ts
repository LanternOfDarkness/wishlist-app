"use server";

import {
    getAuthenticatedUserId,
} from "@/lib/wishlist-command-context";
import {
    createWishlistItemFromIntake,
} from "@/lib/wishlist-item-intake-command";
import type { WishlistItemIntakeInput } from "@/lib/wishlist-item-intake";
import { revalidatePath } from "next/cache";

export type AddItemData = WishlistItemIntakeInput;

export async function addItem(data: AddItemData) {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const item = await createWishlistItemFromIntake(data, userId);

        revalidatePath('/[locale]/[username]', 'page');

        return { success: true, item };
    } catch (error) {
        console.error('Error adding item:', error);
        return { success: false, error: 'Failed to add item' };
    }
}
