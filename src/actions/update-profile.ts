"use server";

import type { Prisma } from "@prisma/client";
import { buildWishlistAppearanceFromFormData } from "@/lib/wishlist-appearance-form";
import { prisma } from "@/lib/prisma";
import {
    requireAuthenticatedUserId,
    getOwnedWishlistAppearance,
} from "@/lib/wishlist-command-context";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const userId = await requireAuthenticatedUserId("Не авторизований");

    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    if (username) {
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser && existingUser.id !== userId) {
            return { error: "Цей нікнейм вже зайнятий" };
        }
    }

    const wishlist = await getOwnedWishlistAppearance(userId);
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
        where: { id: userId },
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
