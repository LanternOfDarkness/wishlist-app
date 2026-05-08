"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function followUser(userIdToFollow: string, currentPath: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Не авторизований");
    }

    if (session.user.id === userIdToFollow) {
        throw new Error("You cannot follow yourself");
    }

    const existingFollow = await prisma.follows.findUnique({
        where: {
            followerId_followingId: {
                followerId: session.user.id,
                followingId: userIdToFollow,
            }
        }
    });

    if (existingFollow) {
        await prisma.follows.delete({
            where: {
                followerId_followingId: {
                    followerId: session.user.id,
                    followingId: userIdToFollow,
                }
            }
        });
    } else {
        await prisma.follows.create({
            data: {
                followerId: session.user.id,
                followingId: userIdToFollow,
            }
        });
    }

    revalidatePath(currentPath);
    return { success: true };
}
