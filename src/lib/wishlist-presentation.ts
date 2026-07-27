import {
  getWishlistAppearancePresentation,
  getWishlistWidgetPresentation,
  toAppearanceRecord,
} from "./wishlist-appearance";
import { getRepository } from "./repository";
import {
  hasActiveWishlistFilters,
  type WishlistSearchParams,
} from "./wishlist-filter-state";
import {
  getViewerRelationship,
  itemVisibilityFor,
  resolveWishlistAccess,
} from "./wishlist-visibility";

type ItemWithPledges = {
  price: number | null;
  isReserved: boolean;
  pledges: Array<{ amount: number | null }>;
};

/**
 * Splits a raw item (with its private `pledges` relation loaded) into the
 * public-facing shape for a viewer. For the owner this deliberately OMITS
 * `isReserved`, `pledgedTotal`, and `progressRatio` entirely — surprise
 * preservation means the owner must not learn whether their item has been
 * reserved, not just have it hidden in the UI. For everyone else it strips
 * the raw `pledges` rows (guest names/messages are never surfaced by the
 * current UI) and replaces them with an aggregate total + progress ratio.
 */
function sanitizeReservationFields<T extends ItemWithPledges>(
  item: T,
  isOwner: boolean,
): Omit<T, "pledges" | "isReserved"> & {
  isReserved?: boolean;
  pledgedTotal?: number;
  progressRatio?: number | null;
} {
  const { pledges, isReserved, ...rest } = item;

  if (isOwner) {
    return rest as Omit<T, "pledges" | "isReserved">;
  }

  const pledgedTotal = pledges.reduce(
    (sum, pledge) => sum + (pledge.amount ?? 0),
    0,
  );
  const progressRatio =
    rest.price && rest.price > 0
      ? Math.min(pledgedTotal / rest.price, 1)
      : null;

  return { ...rest, isReserved, pledgedTotal, progressRatio } as Omit<
    T,
    "pledges" | "isReserved"
  > & { isReserved: boolean; pledgedTotal: number; progressRatio: number | null };
}

function omitIsReserved<T extends { isReserved: boolean }>(
  item: T,
): Omit<T, "isReserved"> {
  const rest: Record<string, unknown> = { ...item };
  delete rest.isReserved;
  return rest as Omit<T, "isReserved">;
}

export async function getWishlistPresentation({
  username,
  viewerUserId,
  searchParams,
  shareKey,
}: {
  username: string;
  viewerUserId?: string;
  searchParams: WishlistSearchParams;
  shareKey?: string;
}) {
  const user = await getRepository().load({ type: "viewer-page-user", username });

  if (!user) {
    return null;
  }

  const relationship = getViewerRelationship(user, viewerUserId);
  // The item filter only depends on the viewer's relationship to the owner,
  // not on the wishlist's own isPublic/shareToken fields (fetched below in
  // the same query), so `canViewWishlist` here is a placeholder — nothing in
  // `itemVisibilityFor("wishlist-page", …)` reads it.
  const itemVisibility = itemVisibilityFor("wishlist-page", {
    canViewWishlist: true,
    canViewPrivateItems: relationship.canViewPrivateItems,
  });

  const categories = Array.isArray(searchParams.category)
    ? searchParams.category
    : searchParams.category
      ? [searchParams.category]
      : undefined;
  const minPrice =
    searchParams.minPrice !== undefined ? Number.parseFloat(searchParams.minPrice) : undefined;
  const maxPrice =
    searchParams.maxPrice !== undefined ? Number.parseFloat(searchParams.maxPrice) : undefined;

  const presentation = await getRepository().load({
    type: "wishlist-presentation",
    userId: user.id,
    itemVisibility,
    categories,
    currency: searchParams.currency,
    minPrice: minPrice !== undefined && !Number.isNaN(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice !== undefined && !Number.isNaN(maxPrice) ? maxPrice : undefined,
    sort: searchParams.sort,
  });

  if (!presentation) {
    return null;
  }

  const access = resolveWishlistAccess({
    wishlist: presentation.wishlist,
    relationship,
    shareKey,
  });

  if (!access.canViewWishlist) {
    return null;
  }

  const appearance = toAppearanceRecord(presentation.wishlist.appearance);
  const appearancePresentation = getWishlistAppearancePresentation(appearance);

  const items = presentation.items.map((item) =>
    sanitizeReservationFields(item, relationship.isOwner),
  );

  return {
    user,
    wishlist: { ...presentation.wishlist, items },
    relationship,
    hasActiveFilters: hasActiveWishlistFilters(searchParams),
    maxPriceOverall: presentation.maxPrice,
    appearance: appearancePresentation,
  };
}

export async function getEmbedWishlistPresentation({
  locale,
  username,
}: {
  locale: string;
  username: string;
}) {
  const presentation = await getRepository().load({ type: "embed-presentation", username });

  if (!presentation) {
    return null;
  }

  // Embeds carry no viewer identity, so a private wishlist can never be
  // embedded (this also closes the private-item leak via the widget).
  if (!presentation.wishlist.isPublic) {
    return null;
  }

  const appearance = toAppearanceRecord(presentation.wishlist.appearance);
  const selectedWidgetItems = presentation.items.filter((item) => item.showInWidget);
  // Embeds carry no viewer identity, so we can never tell whether the owner
  // is the one viewing (e.g. previewing their own widget in Settings).
  // Reservation state is therefore never exposed here, for anyone.
  const displayItems = (
    selectedWidgetItems.length > 0
      ? selectedWidgetItems.slice(0, 5)
      : presentation.items.slice(0, 5)
  ).map(omitIsReserved);

  return {
    user: presentation.user,
    displayItems,
    profileUrl: `/${locale}/${username}`,
    appearance: getWishlistAppearancePresentation(appearance),
    widget: getWishlistWidgetPresentation(appearance),
  };
}
