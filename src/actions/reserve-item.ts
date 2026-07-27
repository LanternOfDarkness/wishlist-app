"use server";

import { createReservation, type ReservationInput } from "@/lib/reservation";
import {
  getAuthenticatedUserId,
  wishlistCommand,
  AuthorizationError,
  ValidationError,
} from "@/lib/wishlist-command";

export type { ReservationInput };

export const reserveItem = wishlistCommand(
  async (input: ReservationInput) => {
    const userId = await getAuthenticatedUserId();
    const result = await createReservation(input, userId);

    if (!result.success) {
      // "Item not found" covers every visibility-gate denial (missing item,
      // archived, private without access, invalid share key) — everything
      // else is a normal reservation-rule outcome, safe to surface verbatim.
      if (result.error === "Item not found") {
        throw new AuthorizationError(result.error);
      }
      throw new ValidationError(result.error);
    }

    return result.pledge;
  },
  { revalidate: ["wishlistPage"], genericErrorMessage: "Failed to reserve item" },
);
