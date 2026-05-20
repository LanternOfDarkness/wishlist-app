"use server";

import { getAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createWishlist(formData: FormData) {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
        return { error: "error_unauthorized" };
    }

    const title = formData.get("title") as string;

    if (!title || title.length < 3) {
        return { error: "error_too_short" };
    }

    const cleanSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

    const uniqueSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;

    try {
        const wishlist = await prisma.wishlist.create({
            data: {
                title,
                slug: uniqueSlug,
                userId,
            },
        });

        revalidatePath("/dashboard");
        return { success: true, wishlist };
    } catch (error) {
        console.error("Помилка створення:", error);
        return { error: "error_generic" };
    }
}
