"use server";

import { prisma } from "@/lib/prisma";
import {
    requireAuthenticatedUserId,
    requireOwnedWishlistItem,
} from "@/lib/wishlist-command-context";
import { revalidatePath } from "next/cache";

export async function setItemArchived(itemId: string, archived: boolean) {
    try {
        const userId = await requireAuthenticatedUserId();
        await requireOwnedWishlistItem(itemId, userId);

        const item = await prisma.item.update({
            where: { id: itemId },
            data: { isArchived: archived },
        });

        revalidatePath('/[locale]/[username]', 'page');

        return { success: true, item };
    } catch (error) {
        console.error('Error archiving item:', error);
        return { success: false, error: 'Failed to update item' };
    }
}
