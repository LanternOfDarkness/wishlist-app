import { getRepository } from "./repository";
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
 * allowed to reserve their own item. The actual mutation (race-safe full
 * reservation / partial-pledge accumulation) lives behind the repository's
 * `create-pledge` command, identical on both adapters.
 */
export async function createReservation(
  input: ReservationInput,
  userId: string | null,
): Promise<ReservationResult> {
  const mode: ReservationMode = input.mode === "partial" ? "partial" : "full";

  const item = await getRepository().load({
    type: "item-for-reservation",
    itemId: input.itemId,
  });

  if (!item || item.isArchived) {
    return { success: false, error: "Item not found" };
  }

  const relationship = getViewerRelationship(item.wishlist.user, userId ?? undefined);
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

  const result = await getRepository().execute({
    type: "create-pledge",
    itemId: item.id,
    userId,
    mode,
    amount: input.amount,
    message,
    guestName,
    isAnonymous,
  });

  if (!result.success) {
    return result;
  }

  return { success: true, pledge: { id: result.pledgeId } };
}
