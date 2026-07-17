"use server";

import { Prisma } from "@prisma/client";

import {
    countSelectedWidgetItems,
    requireAuthenticatedUserId,
    requireOwnedWishlistItem,
} from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const MAX_WIDGET_ITEMS = 5;

class WidgetLimitExceededError extends Error {}

// Postgres error code for "could not serialize access due to concurrent
// update" — the write-conflict Prisma surfaces as P2034 under Serializable
// isolation. See https://www.prisma.io/docs/orm/reference/error-reference#p2034
const SERIALIZATION_FAILURE_CODE = "P2034";

function isSerializationFailure(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === SERIALIZATION_FAILURE_CODE
    );
}

export async function updateWidgetItems(itemId: string, showInWidget: boolean) {
    const userId = await requireAuthenticatedUserId();
    await requireOwnedWishlistItem(itemId, userId);

    try {
        // Serializable isolation closes the count-then-update race: if two
        // concurrent requests would both read a count under the limit and
        // both try to push it over, Postgres aborts one with a serialization
        // failure instead of silently letting the cap be exceeded.
        await prisma.$transaction(
            async (tx) => {
                if (showInWidget) {
                    const count = await countSelectedWidgetItems(userId, tx);

                    if (count >= MAX_WIDGET_ITEMS) {
                        throw new WidgetLimitExceededError();
                    }
                }

                await tx.item.update({
                    where: { id: itemId },
                    data: { showInWidget },
                });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    } catch (error) {
        if (error instanceof WidgetLimitExceededError) {
            return { error: "Maximum 5 items can be shown in widget" };
        }
        if (isSerializationFailure(error)) {
            return { error: "Please try again" };
        }
        throw error;
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/[locale]/embed/[username]", "page");

    return { success: true };
}
