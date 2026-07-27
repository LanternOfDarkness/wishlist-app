"use server";

import { getRepository } from "@/lib/repository";
import {
  normalizeWishlistItemIntake,
  type WishlistItemIntakeInput,
} from "@/lib/wishlist-item-intake";
import {
  requireAuthenticatedUserId,
  requireOwned,
  wishlistCommand,
} from "@/lib/wishlist-command";

export type AddItemData = WishlistItemIntakeInput;

export const addItem = wishlistCommand(
  async (data: AddItemData) => {
    const userId = await requireAuthenticatedUserId();
    const intake = normalizeWishlistItemIntake(data);

    await requireOwned(
      getRepository().require({
        type: "owned-wishlist",
        wishlistId: intake.wishlistId,
        userId,
        message: "Wishlist not found or access denied",
      }),
    );

    return getRepository().execute({
      type: "add-item",
      userId,
      item: intake,
    });
  },
  { revalidate: ["wishlistPage"], genericErrorMessage: "Failed to add item" },
);
