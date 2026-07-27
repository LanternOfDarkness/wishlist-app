import {
  resolveWishlistAppearance,
  type WishlistAppearance,
} from "./wishlist-appearance";
import { prisma } from "./prisma";
import {
  buildWishlistItemOrderBy,
  buildWishlistItemWhere,
  hasActiveWishlistFilters,
  type WishlistSearchParams,
} from "./wishlist-filter-state";
import {
  getViewerRelationship,
  itemVisibilityFor,
  matchesShareToken,
  resolveWishlistAccess,
} from "./wishlist-visibility";

export {
  buildWishlistItemOrderBy,
  buildWishlistItemWhere,
  hasActiveWishlistFilters,
  type WishlistSearchParams,
};

// Re-exported from wishlist-visibility.ts (the single owner of the rule) for
// one phase to keep this diff small. Drop this re-export once the last
// import of these two from this module (the test file) is repointed.
export { getViewerRelationship, matchesShareToken };

// ── Appearance presentation helpers ──────────────────────────────────────
// These live here (not in wishlist-appearance.ts) to match main's deepen
// architecture; audit's branch imported them from wishlist-appearance, so we
// define them locally and re-export by declaration.

export function getWishlistAppearanceRecord(
  appearance: unknown,
): WishlistAppearance {
  if (!appearance || typeof appearance !== "object" || Array.isArray(appearance)) {
    return {};
  }

  return appearance as WishlistAppearance;
}

function getAppearanceString(
  appearance: WishlistAppearance,
  key: string,
  fallback = "",
) {
  const value = appearance[key];
  return typeof value === "string" ? value : fallback;
}

function getAppearanceNumber(
  appearance: WishlistAppearance,
  key: string,
  fallback: number,
) {
  const value = appearance[key];
  return typeof value === "number" ? value : fallback;
}

// `font` and `itemBorder` are allow-list validated on write by
// `parseWishlistAppearance` (wishlist-appearance.ts), so a stored value is
// already safe by construction — this just reads it back with a default for
// records written before that field existed.
export function getWishlistAppearancePresentation(
  appearance: WishlistAppearance,
) {
  const resolvedAppearance = resolveWishlistAppearance(appearance);

  return {
    raw: appearance,
    resolved: resolvedAppearance,
    primaryColor: resolvedAppearance.primaryColor,
    fontClass: getAppearanceString(appearance, "font", "font-sans"),
    itemBorderClass: getAppearanceString(
      appearance,
      "itemBorder",
      "rounded-lg border-solid",
    ),
    welcomeMessage: getAppearanceString(appearance, "welcomeMessage"),
    favoriteCurrencies: Array.isArray(appearance.favoriteCurrencies)
      ? appearance.favoriteCurrencies.filter(
          (currency): currency is string => typeof currency === "string",
        )
      : [],
  };
}

export function getWishlistWidgetPresentation(
  appearance: WishlistAppearance,
) {
  const widgetLayout =
    getAppearanceString(appearance, "widgetLayout", "grid") === "list"
      ? "list"
      : "grid";
  const widgetItemSize = Math.min(
    Math.max(Math.round(getAppearanceNumber(appearance, "widgetItemSize", 100)), 70),
    160,
  );

  return {
    widgetLayout,
    widgetItemSize,
  };
}

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

export function getMaxWishlistItemPrice(items: Array<{ price: number | null }>) {
  const prices = items
    .map((item) => item.price)
    .filter((price): price is number => price !== null);

  if (prices.length === 0) {
    return 10000;
  }

  const maxPrice = Math.max(...prices);
  return maxPrice > 0 ? maxPrice : 10000;
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
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      categories: true,
      followers: { select: { followerId: true } },
      following: { select: { followingId: true } },
    },
  });

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
  const itemWhere = buildWishlistItemWhere(searchParams, itemVisibility);
  const orderBy = buildWishlistItemOrderBy(searchParams.sort);

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        where: itemWhere,
        orderBy,
        include: {
          category: true,
          // Only partial-pledge amounts are needed for the progress bar;
          // guest names/messages are never fetched here at all.
          pledges: { where: { mode: "partial" }, select: { amount: true } },
        },
      },
    },
  });

  if (!wishlist) {
    return null;
  }

  const access = resolveWishlistAccess({ wishlist, relationship, shareKey });

  if (!access.canViewWishlist) {
    return null;
  }

  const appearance = getWishlistAppearanceRecord(wishlist.appearance);
  const appearancePresentation = getWishlistAppearancePresentation(appearance);

  const items = wishlist.items.map((item) =>
    sanitizeReservationFields(item, relationship.isOwner),
  );

  return {
    user,
    wishlist: { ...wishlist, items },
    relationship,
    itemWhere,
    hasActiveFilters: hasActiveWishlistFilters(searchParams),
    maxPriceOverall: getMaxWishlistItemPrice(items),
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
  // Embeds carry no viewer identity, so `canViewPrivateItems` is always
  // false — `itemVisibilityFor("embed", …)` ignores it either way.
  const itemWhere = buildWishlistItemWhere(
    {},
    itemVisibilityFor("embed", { canViewWishlist: true, canViewPrivateItems: false }),
  );

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      wishlist: {
        include: {
          items: {
            where: itemWhere,
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          },
        },
      },
    },
  });

  if (!user?.wishlist) {
    return null;
  }

  // Embeds carry no viewer identity, so a private wishlist can never be
  // embedded (this also closes the private-item leak via the widget).
  if (!user.wishlist.isPublic) {
    return null;
  }

  const appearance = getWishlistAppearanceRecord(user.wishlist.appearance);
  const selectedWidgetItems = user.wishlist.items.filter(
    (item) => item.showInWidget,
  );
  // Embeds carry no viewer identity, so we can never tell whether the owner
  // is the one viewing (e.g. previewing their own widget in Settings).
  // Reservation state is therefore never exposed here, for anyone.
  const displayItems = (
    selectedWidgetItems.length > 0
      ? selectedWidgetItems.slice(0, 5)
      : user.wishlist.items.slice(0, 5)
  ).map(omitIsReserved);

  return {
    user,
    displayItems,
    profileUrl: `/${locale}/${username}`,
    appearance: getWishlistAppearancePresentation(appearance),
    widget: getWishlistWidgetPresentation(appearance),
  };
}
