"use server";

import { getRepository } from "@/lib/repository";
import {
  requireAuthenticatedUserId,
  requireOwned,
  wishlistCommand,
} from "@/lib/wishlist-command";

export const deleteItem = wishlistCommand(
  async (itemId: string) => {
    const userId = await requireAuthenticatedUserId();
    await requireOwned(
      getRepository().require({ type: "owned-item", itemId, userId, message: "Item not found" }),
    );

    await getRepository().execute({ type: "delete-item", itemId });
  },
  { revalidate: ["wishlistPage"], genericErrorMessage: "Failed to delete item" },
);
