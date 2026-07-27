"use server";

import { getRepository } from "@/lib/repository";
import {
  requireAuthenticatedUserId,
  requireOwned,
  wishlistCommand,
} from "@/lib/wishlist-command";

export const setItemArchived = wishlistCommand(
  async (itemId: string, archived: boolean) => {
    const userId = await requireAuthenticatedUserId();
    await requireOwned(
      getRepository().require({ type: "owned-item", itemId, userId, message: "Item not found" }),
    );

    return getRepository().execute({ type: "set-item-archived", itemId, archived });
  },
  { revalidate: ["wishlistPage"], genericErrorMessage: "Failed to update item" },
);
