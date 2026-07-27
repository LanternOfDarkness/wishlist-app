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

export type UpdateItemData = Omit<WishlistItemIntakeInput, "wishlistId">;

export const updateItem = wishlistCommand(
  async (itemId: string, data: UpdateItemData) => {
    const userId = await requireAuthenticatedUserId();
    const existingItem = await requireOwned(
      getRepository().require({ type: "owned-item", itemId, userId, message: "Item not found" }),
    );

    // On edit the category field is always submitted, so an empty selection
    // means "clear the category" rather than "leave unchanged" — normalizing
    // with the existing item's wishlistId keeps this the same intake rules
    // add-item uses.
    const intake = normalizeWishlistItemIntake({
      ...data,
      wishlistId: existingItem.wishlistId,
    });

    return getRepository().execute({
      type: "update-item",
      itemId,
      userId,
      item: intake,
    });
  },
  { revalidate: ["wishlistPage"], genericErrorMessage: "Failed to update item" },
);
