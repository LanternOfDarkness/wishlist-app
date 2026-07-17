"use server";

import {
    getAuthenticatedUserId,
} from "@/lib/wishlist-command-context";
import {
    createWishlistItemFromIntake,
} from "@/lib/wishlist-item-intake-command";
import type { WishlistItemIntakeInput } from "@/lib/wishlist-item-intake";
import { revalidatePath } from "next/cache";

export type AddItemData = WishlistItemIntakeInput;

// Domain errors thrown by the intake/command layer that are safe to surface
// verbatim to the client (validation feedback, ownership denial). Anything
// else (DB/infra failures) stays behind a generic message so internal
// details are never leaked — but is still distinguishable from these in logs.
const KNOWN_ERROR_MESSAGES = new Set([
    'Item name is required',
    'Wishlist not found or access denied',
]);

export async function addItem(data: AddItemData) {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const item = await createWishlistItemFromIntake(data, userId);

        revalidatePath('/[locale]/[username]', 'page');

        return { success: true, item };
    } catch (error) {
        const isKnownError =
            error instanceof Error && KNOWN_ERROR_MESSAGES.has(error.message);

        console.error(
            isKnownError ? 'Rejected adding item:' : 'Error adding item:',
            error,
        );

        return {
            success: false,
            error: isKnownError ? (error as Error).message : 'Failed to add item',
        };
    }
}
