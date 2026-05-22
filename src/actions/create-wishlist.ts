"use server";

import { getAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { getRepository } from "@/lib/repository";
import { slugifyWithTimestamp } from "@/lib/slug";
import { failure, success, type ActionResult } from "@/lib/action-result";
import { REVALIDATION_PATHS } from "@/lib/revalidate-paths";
import { revalidatePath } from "next/cache";

export async function createWishlist(formData: FormData): Promise<ActionResult> {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
        return failure("error_unauthorized");
    }

    const title = formData.get("title") as string;

    if (!title || title.length < 3) {
        return failure("error_too_short");
    }

    const slug = slugifyWithTimestamp(title);

    try {
        const wishlist = await getRepository().execute({
            type: "create-wishlist",
            userId,
            title,
            slug,
        });

        revalidatePath(REVALIDATION_PATHS.dashboard.path, REVALIDATION_PATHS.dashboard.type);
        return success(wishlist) as ActionResult;
    } catch (error) {
        console.error("Error creating wishlist:", error);
        return failure("error_generic");
    }
}
