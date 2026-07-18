"use server";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { revalidatePath } from "next/cache";

/**
 * Generates a fresh secret share token for the caller's wishlist, invalidating
 * any previously shared link. Used both to create the first link and to reset
 * (rotate) an existing one.
 */
export async function regenerateShareToken() {
    try {
        const userId = await requireAuthenticatedUserId();
        const shareToken = randomBytes(16).toString("hex");

        await prisma.wishlist.update({
            where: { userId },
            data: { shareToken },
        });

        revalidatePath("/dashboard/settings");
        revalidatePath("/[locale]/[username]", "page");

        return { success: true as const, shareToken };
    } catch (error) {
        console.error("Error regenerating share token:", error);
        return { success: false as const, error: "Failed to update share link" };
    }
}

/**
 * Clears the share token so any previously shared link stops working. The
 * wishlist stays reachable to its owner and mutual followers.
 */
export async function revokeShareToken() {
    try {
        const userId = await requireAuthenticatedUserId();

        await prisma.wishlist.update({
            where: { userId },
            data: { shareToken: null },
        });

        revalidatePath("/dashboard/settings");
        revalidatePath("/[locale]/[username]", "page");

        return { success: true as const };
    } catch (error) {
        console.error("Error revoking share token:", error);
        return { success: false as const, error: "Failed to revoke share link" };
    }
}
