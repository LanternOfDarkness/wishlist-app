"use server";

import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { buildWishlistAppearanceFromFormData } from "@/lib/wishlist-appearance-form";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Не авторизований");
    }

    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    if (username) {
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser && existingUser.id !== session.user.id) {
            return { error: "Цей нікнейм вже зайнятий" };
        }
    }

    const wishlist = await prisma.wishlist.findUnique({
        where: { userId: session.user.id },
        select: { appearance: true },
    });
    const currentAppearance =
        wishlist?.appearance &&
        typeof wishlist.appearance === "object" &&
        !Array.isArray(wishlist.appearance)
            ? (wishlist.appearance as Prisma.JsonObject)
            : ({} as Prisma.JsonObject);

    const appearance = buildWishlistAppearanceFromFormData(
      currentAppearance,
      formData,
    );

    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            name,
            username,
            wishlist: {
                update: {
                    appearance
                }
            }
        },
    });

    revalidatePath("/dashboard");
    revalidatePath("/[locale]/[username]", "page");
    revalidatePath("/[locale]/embed/[username]", "page");
    return { success: true };
}
