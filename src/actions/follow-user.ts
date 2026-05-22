"use server";

import { requireAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { getRepository } from "@/lib/repository";
import { revalidatePath } from "next/cache";

export async function followUser(userIdToFollow: string, currentPath: string) {
    const userId = await requireAuthenticatedUserId("Не авторизований");

    if (userId === userIdToFollow) {
        throw new Error("You cannot follow yourself");
    }

    await getRepository().execute({
        type: "toggle-follow",
        followerId: userId,
        followingId: userIdToFollow,
    });

    revalidatePath(currentPath);
    return { success: true };
}
