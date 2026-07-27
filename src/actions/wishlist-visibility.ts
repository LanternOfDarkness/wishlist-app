"use server";

import { getRepository } from "@/lib/repository";
import { requireAuthenticatedUserId, wishlistCommand } from "@/lib/wishlist-command";

/**
 * Generates a fresh secret share token for the caller's wishlist, invalidating
 * any previously shared link. Used both to create the first link and to reset
 * (rotate) an existing one.
 */
export const regenerateShareToken = wishlistCommand(
  async () => {
    const userId = await requireAuthenticatedUserId();
    return getRepository().execute({ type: "regenerate-share-token", userId });
  },
  {
    revalidate: ["dashboardSettings", "wishlistPage"],
    genericErrorMessage: "Failed to update share link",
  },
);

/**
 * Clears the share token so any previously shared link stops working. The
 * wishlist stays reachable to its owner and mutual followers.
 */
export const revokeShareToken = wishlistCommand(
  async () => {
    const userId = await requireAuthenticatedUserId();
    await getRepository().execute({ type: "revoke-share-token", userId });
  },
  {
    revalidate: ["dashboardSettings", "wishlistPage"],
    genericErrorMessage: "Failed to revoke share link",
  },
);
