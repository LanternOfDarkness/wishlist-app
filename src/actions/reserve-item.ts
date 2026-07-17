"use server";

import { getAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { createReservation, type ReservationInput } from "@/lib/reservation";
import { revalidatePath } from "next/cache";

export type { ReservationInput };

export async function reserveItem(input: ReservationInput) {
    try {
        const userId = await getAuthenticatedUserId();
        const result = await createReservation(input, userId);

        if (result.success) {
            revalidatePath('/[locale]/[username]', 'page');
        }

        return result;
    } catch (error) {
        console.error('Error reserving item:', error);
        return { success: false as const, error: 'Failed to reserve item' };
    }
}
