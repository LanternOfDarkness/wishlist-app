import { prisma } from "./prisma";

// Single source of truth for the auto-created wishlist's default title.
// Previously duplicated (with different values!) between the auth.ts
// `createUser` event and the dashboard page's defensive fallback.
export const DEFAULT_WISHLIST_TITLE = "Мої бажання";

/**
 * Returns the user's wishlist, creating one with the default title if it
 * doesn't exist yet. Every user has at most one wishlist (`userId` is
 * `@unique` on `Wishlist`), so this is safe to call whenever a wishlist is
 * expected to exist but might not (e.g. right after signup, or as a
 * defensive fallback if it was somehow never created).
 */
export async function ensureUserWishlist(userId: string, slug: string) {
  const existing = await prisma.wishlist.findUnique({ where: { userId } });

  if (existing) {
    return existing;
  }

  return prisma.wishlist.create({
    data: {
      userId,
      title: DEFAULT_WISHLIST_TITLE,
      slug,
    },
  });
}
