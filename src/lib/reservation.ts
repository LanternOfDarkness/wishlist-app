import { prisma } from "./prisma";
import { getViewerRelationship, resolveWishlistAccess } from "./wishlist-visibility";

export type ReservationMode = "full" | "partial";

export interface ReservationInput {
  itemId: string;
  mode: ReservationMode;
  amount?: number;
  message?: string;
  guestName?: string;
  isAnonymous?: boolean;
  /** Secret share-link key, so a share-link visitor can reserve on an otherwise private wishlist. */
  shareKey?: string;
}

export type ReservationResult =
  | { success: true; pledge: { id: string } }
  | { success: false; error: string };

const MAX_MESSAGE_LENGTH = 500;
const MAX_NAME_LENGTH = 80;

function normalizeOptionalString(value: string | undefined, maxLength: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

/**
 * Creates a reservation or a partial pledge for an item. Authorization here
 * goes through the same `resolveWishlistAccess` call as
 * `getWishlistPresentation`'s visibility gate (public wishlist, owner, mutual
 * follower, or a valid share key), so a raw item id can't be used to reserve
 * an item on a wishlist the caller has no access to. The owner is never
 * allowed to reserve their own item.
 */
export async function createReservation(
  input: ReservationInput,
  userId: string | null,
): Promise<ReservationResult> {
  const mode: ReservationMode = input.mode === "partial" ? "partial" : "full";

  const item = await prisma.item.findUnique({
    where: { id: input.itemId },
    select: {
      id: true,
      price: true,
      isReserved: true,
      isArchived: true,
      isPrivate: true,
      wishlist: {
        select: {
          id: true,
          isPublic: true,
          shareToken: true,
          user: {
            select: {
              id: true,
              followers: { select: { followerId: true } },
              following: { select: { followingId: true } },
            },
          },
        },
      },
    },
  });

  if (!item || item.isArchived || !item.wishlist) {
    return { success: false, error: "Item not found" };
  }

  const relationship = getViewerRelationship(
    item.wishlist.user,
    userId ?? undefined,
  );
  const access = resolveWishlistAccess({
    wishlist: item.wishlist,
    relationship,
    shareKey: input.shareKey,
  });

  if (!access.canViewWishlist) {
    return { success: false, error: "Item not found" };
  }

  if (item.isPrivate && !access.canViewPrivateItems) {
    return { success: false, error: "Item not found" };
  }

  if (relationship.isOwner) {
    return { success: false, error: "You cannot reserve your own item" };
  }

  if (item.isReserved) {
    return { success: false, error: "Item is already reserved" };
  }

  const guestName = normalizeOptionalString(input.guestName, MAX_NAME_LENGTH);
  const message = normalizeOptionalString(input.message, MAX_MESSAGE_LENGTH);
  const isAnonymous = input.isAnonymous === true;

  if (mode === "full") {
    return reserveItemFully({
      itemId: item.id,
      userId,
      guestName,
      message,
      isAnonymous,
    });
  }

  return pledgeItemPartially({
    itemId: item.id,
    itemPrice: item.price,
    userId,
    guestName,
    message,
    isAnonymous,
    amount: input.amount,
  });
}

async function reserveItemFully(params: {
  itemId: string;
  userId: string | null;
  guestName: string | undefined;
  message: string | undefined;
  isAnonymous: boolean;
}): Promise<ReservationResult> {
  return prisma.$transaction(async (tx) => {
    // Atomic compare-and-swap: only succeeds if the item was still
    // unreserved at the moment of the update. Under concurrent requests,
    // Postgres row-locks this update so exactly one caller sees count === 1.
    const updated = await tx.item.updateMany({
      where: { id: params.itemId, isReserved: false },
      data: { isReserved: true },
    });

    if (updated.count === 0) {
      return { success: false, error: "Item is already reserved" };
    }

    const pledge = await tx.pledge.create({
      data: {
        itemId: params.itemId,
        mode: "full",
        userId: params.userId ?? undefined,
        guestName: params.guestName,
        message: params.message,
        isAnonymous: params.isAnonymous,
      },
      select: { id: true },
    });

    return { success: true, pledge };
  });
}

async function pledgeItemPartially(params: {
  itemId: string;
  itemPrice: number | null;
  userId: string | null;
  guestName: string | undefined;
  message: string | undefined;
  isAnonymous: boolean;
  amount: number | undefined;
}): Promise<ReservationResult> {
  if (params.itemPrice == null || params.itemPrice <= 0) {
    return {
      success: false,
      error: "This item does not support partial contributions",
    };
  }

  const amount =
    typeof params.amount === "number" && Number.isFinite(params.amount)
      ? params.amount
      : NaN;

  if (!(amount > 0)) {
    return { success: false, error: "A valid contribution amount is required" };
  }

  const itemPrice = params.itemPrice;

  return prisma.$transaction(async (tx) => {
    // Re-check freshness inside the transaction to shrink (not eliminate)
    // the race window against a concurrent full reservation. A full,
    // airtight guard would need a row lock (e.g. SELECT ... FOR UPDATE);
    // skipped here since a partial pledge landing just after a full
    // reservation is a display inconsistency, not a double-booking.
    const current = await tx.item.findUnique({
      where: { id: params.itemId },
      select: { isReserved: true },
    });

    if (!current || current.isReserved) {
      return { success: false, error: "Item is already reserved" };
    }

    const pledge = await tx.pledge.create({
      data: {
        itemId: params.itemId,
        mode: "partial",
        amount,
        userId: params.userId ?? undefined,
        guestName: params.guestName,
        message: params.message,
        isAnonymous: params.isAnonymous,
      },
      select: { id: true },
    });

    const total = await tx.pledge.aggregate({
      where: { itemId: params.itemId, mode: "partial" },
      _sum: { amount: true },
    });

    const pledgedTotal = total._sum.amount ?? 0;

    if (pledgedTotal >= itemPrice) {
      await tx.item.update({
        where: { id: params.itemId },
        data: { isReserved: true },
      });
    }

    return { success: true, pledge };
  });
}
