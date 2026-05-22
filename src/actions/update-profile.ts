"use server";

import type { Prisma } from "@prisma/client";
import { buildWishlistAppearanceFromFormData } from "@/lib/wishlist-appearance-form";
import { requireAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { getRepository } from "@/lib/repository";
import { failure, success, type ActionResult } from "@/lib/action-result";
import { REVALIDATION_PATHS } from "@/lib/revalidate-paths";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
    const userId = await requireAuthenticatedUserId();

    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    if (username) {
        const existingUser = await getRepository().load({ type: "user-by-username", username });
        if (existingUser && existingUser.id !== userId) {
            return failure("Username already taken");
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

    revalidatePath(REVALIDATION_PATHS.dashboard.path, REVALIDATION_PATHS.dashboard.type);
    revalidatePath(REVALIDATION_PATHS.wishlistPage.path, REVALIDATION_PATHS.wishlistPage.type);
    revalidatePath(REVALIDATION_PATHS.embedPage.path, REVALIDATION_PATHS.embedPage.type);
    return success();
}
