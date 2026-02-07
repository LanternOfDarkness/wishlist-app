"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createWishlist(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "Не авторизований" };
    }

    const title = formData.get("title") as string;

    if (!title || title.length < 3) {
        return { error: "Назва має бути довшою за 3 символи" };
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
                userId: session.user.id,
            },
        });

        revalidatePath("/dashboard");
        return { success: true, wishlist };
    } catch (error) {
        console.error("Помилка створення:", error);
        return { error: "Не вдалося створити вішліст" };
    }
}