"use server";

import { prisma } from "@/lib/prisma";
import {
    requireAuthenticatedUserId,
    requireOwnedWishlistItem,
} from "@/lib/wishlist-command-context";
import { revalidatePath } from "next/cache";

export async function deleteItem(itemId: string) {
    try {
        const userId = await requireAuthenticatedUserId();
        await requireOwnedWishlistItem(itemId, userId);

        await prisma.item.delete({ where: { id: itemId } });

        revalidatePath('/[locale]/[username]', 'page');

        return { success: true };
    } catch (error) {
        console.error('Error deleting item:', error);
        return { success: false, error: 'Failed to delete item' };
    }
}
