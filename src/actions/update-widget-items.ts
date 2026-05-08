"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateWidgetItems(itemId: string, showInWidget: boolean) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // Verify item belongs to user
    const item = await prisma.item.findFirst({
        where: {
            id: itemId,
            wishlist: {
                userId: session.user.id
            }
        }
    });

    if (!item) {
        throw new Error("Item not found");
    }

    if (showInWidget) {
        const count = await prisma.item.count({
            where: {
                wishlist: {
                    userId: session.user.id
                },
                showInWidget: true
            }
        });

        if (count >= 5) {
            return { error: "Maximum 5 items can be shown in widget" };
        }
    }

    await prisma.item.update({
        where: { id: itemId },
        data: { showInWidget }
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/embed/[username]");

    return { success: true };
}
