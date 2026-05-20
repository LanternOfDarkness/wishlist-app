import { auth } from "@/auth";

import { prisma } from "./prisma";

export async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id || null;
}

export async function requireAuthenticatedUserId(message = "Unauthorized") {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error(message);
  }

  return userId;
}

export async function findOwnedWishlistById(wishlistId: string, userId: string) {
  return prisma.wishlist.findFirst({
    where: {
      id: wishlistId,
      userId,
    },
  });
}

export async function requireOwnedWishlistById(
  wishlistId: string,
  userId: string,
  message = "Wishlist not found or access denied",
) {
  const wishlist = await findOwnedWishlistById(wishlistId, userId);

  if (!wishlist) {
    throw new Error(message);
  }

  return wishlist;
}

export async function getOwnedWishlistAppearance(userId: string) {
  return prisma.wishlist.findUnique({
    where: { userId },
    select: {
      id: true,
      appearance: true,
    },
  });
}

export async function requireOwnedWishlistAppearance(
  userId: string,
  message = "Wishlist not found",
) {
  const wishlist = await getOwnedWishlistAppearance(userId);

  if (!wishlist) {
    throw new Error(message);
  }

  return wishlist;
}

export async function findOwnedWishlistItem(itemId: string, userId: string) {
  return prisma.item.findFirst({
    where: {
      id: itemId,
      wishlist: {
        userId,
      },
    },
  });
}

export async function requireOwnedWishlistItem(
  itemId: string,
  userId: string,
  message = "Item not found",
) {
  const item = await findOwnedWishlistItem(itemId, userId);

  if (!item) {
    throw new Error(message);
  }

  return item;
}

export async function countSelectedWidgetItems(userId: string) {
  return prisma.item.count({
    where: {
      wishlist: {
        userId,
      },
      showInWidget: true,
    },
  });
}
