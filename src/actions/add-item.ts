"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface AddItemData {
    name: string;
    url?: string;
    imageUrl?: string;
    price?: number;
    currency?: string;
    priority?: number;
    wishlistId: string;
}

export async function addItem(data: AddItemData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Verify that the wishlist belongs to the user
        const wishlist = await prisma.wishlist.findFirst({
            where: {
                id: data.wishlistId,
                userId: session.user.id,
            },
        });

        if (!wishlist) {
            return { success: false, error: 'Wishlist not found or access denied' };
        }

        const item = await prisma.item.create({
            data: {
                name: data.name,
                url: data.url,
                imageUrl: data.imageUrl,
                price: data.price,
                currency: data.currency || 'UAH',
                priority: data.priority || 0,
                wishlistId: data.wishlistId,
            },
        });

        // Revalidate wishlist page
        revalidatePath('/[locale]/[username]', 'page');

        return { success: true, item };
    } catch (error) {
        console.error('Error adding item:', error);
        return { success: false, error: 'Failed to add item' };
    }
}
