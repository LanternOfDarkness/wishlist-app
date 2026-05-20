"use server";

import {
    getAuthenticatedUserId,
    requireOwnedWishlistById,
} from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface AddItemData {
    isPrivate?: boolean;
    name: string;
    url?: string;
    imageUrl?: string;
    price?: number;
    currency?: string;
    priority?: number;
    wishlistId: string;
    categoryId?: string;
    newCategoryName?: string;
}

export async function addItem(data: AddItemData) {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await requireOwnedWishlistById(data.wishlistId, userId);

        let finalCategoryId = data.categoryId;

        if (data.newCategoryName) {
            const category = await prisma.category.create({
                data: {
                    name: data.newCategoryName,
                    userId,
                }
            });
            finalCategoryId = category.id;
        }

        const item = await prisma.item.create({
            data: {
                name: data.name,
                url: data.url,
                imageUrl: data.imageUrl,
                price: data.price,
                currency: data.currency || 'UAH',
                priority: data.priority || 0,
                isPrivate: data.isPrivate || false,
                wishlistId: data.wishlistId,
                categoryId: finalCategoryId,
            },
        });

        revalidatePath('/[locale]/[username]', 'page');

        return { success: true, item };
    } catch (error) {
        console.error('Error adding item:', error);
        return { success: false, error: 'Failed to add item' };
    }
}
