"use server";

import { requireAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function followUser(userIdToFollow: string, currentPath: string) {
    const userId = await requireAuthenticatedUserId("Не авторизований");

    if (userId === userIdToFollow) {
        throw new Error("You cannot follow yourself");
    }

    const existingFollow = await prisma.follows.findUnique({
        where: {
            followerId_followingId: {
                followerId: userId,
                followingId: userIdToFollow,
            }
        }
    });

    if (existingFollow) {
        await prisma.follows.delete({
            where: {
                followerId_followingId: {
                    followerId: userId,
                    followingId: userIdToFollow,
                }
            }
        });
    } else {
        await prisma.follows.create({
            data: {
                followerId: userId,
                followingId: userIdToFollow,
            }
        });
    }

    revalidatePath(currentPath);
    return { success: true };
}
