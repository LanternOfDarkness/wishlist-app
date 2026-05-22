"use server";

import type { Prisma } from "@prisma/client";
import { buildWishlistAppearanceFromFormData } from "@/lib/wishlist-appearance-form";
import {
    requireAuthenticatedUserId,
} from "@/lib/wishlist-command-context";
import { getRepository } from "@/lib/repository";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const userId = await requireAuthenticatedUserId("Не авторизований");

    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    if (username) {
        const existingUser = await getRepository().load({ type: "user-by-username", username });
        if (existingUser && existingUser.id !== userId) {
            return { error: "Цей нікнейм вже зайнятий" };
        }
    }

    const wishlist = await getRepository().require({ type: "wishlist-appearance", userId });
    const currentAppearance = wishlist.appearance;

    const appearance = buildWishlistAppearanceFromFormData(
      currentAppearance as unknown as Prisma.JsonObject,
      formData,
    );

    await getRepository().execute({
        type: "update-user-profile",
        userId,
        name,
        username,
        appearance,
    });

    revalidatePath("/dashboard");
    revalidatePath("/[locale]/[username]", "page");
    revalidatePath("/[locale]/embed/[username]", "page");
    return { success: true };
}
