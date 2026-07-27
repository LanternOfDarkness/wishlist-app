"use server";

import { requireAuthenticatedUserId } from "@/lib/wishlist-command";
import { getRepository } from "@/lib/repository";
import { success, type ActionResult } from "@/lib/action-result";
import { revalidatePath } from "next/cache";

export async function followUser(userIdToFollow: string, currentPath: string): Promise<ActionResult> {
    const userId = await requireAuthenticatedUserId();

    if (userId === userIdToFollow) {
        throw new Error("You cannot follow yourself");
    }

    await getRepository().execute({
        type: "toggle-follow",
        followerId: userId,
        followingId: userIdToFollow,
    });

    revalidatePath(currentPath);
    return success();
}
