"use server";

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
    try {
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
