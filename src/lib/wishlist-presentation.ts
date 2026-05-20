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

export {
  buildWishlistItemOrderBy,
  buildWishlistItemWhere,
  hasActiveWishlistFilters,
  type WishlistSearchParams,
};

type ViewerRelationshipUser = {
  id: string;
  followers: Array<{ followerId: string }>;
  following: Array<{ followingId: string }>;
};

type WishlistFontClass =
  | "font-sans"
  | "font-serif"
  | "font-mono"
  | "font-comic"
  | "font-georgia"
  | "font-trebuchet"
  | "font-verdana";

const ALLOWED_FONT_CLASSES: WishlistFontClass[] = [
  "font-sans",
  "font-serif",
  "font-mono",
  "font-comic",
  "font-georgia",
  "font-trebuchet",
  "font-verdana",
];
const LEGACY_BORDER_DEFAULTS: Record<string, string> = {
  "rounded-none": "rounded-none border-solid",
  "rounded-md": "rounded-md border-solid",
  "rounded-lg": "rounded-lg border-solid",
  "rounded-2xl": "rounded-2xl border-solid",
};
const ALLOWED_ITEM_BORDER_CLASSES = [
  "rounded-none border-solid",
  "rounded-md border-solid",
  "rounded-lg border-solid",
  "rounded-2xl border-solid",
  "rounded-lg border-dashed",
  "rounded-lg border-dotted",
  "rounded-lg border-double",
] as const;

export function getViewerRelationship(
  user: ViewerRelationshipUser,
  viewerUserId?: string,
) {
  const isOwner = viewerUserId === user.id;
  const isFollowing = viewerUserId
    ? user.followers.some((follow) => follow.followerId === viewerUserId)
    : false;
  const userFollowsViewer = viewerUserId
    ? user.following.some((follow) => follow.followingId === viewerUserId)
    : false;
  const isMutualFollower = isFollowing && userFollowsViewer;

  return {
    isOwner,
    isFollowing,
    isMutualFollower,
    canViewPrivateItems: isOwner || isMutualFollower,
  };
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

export function normalizeWishlistFontClass(value: string): WishlistFontClass {
  return ALLOWED_FONT_CLASSES.includes(value as WishlistFontClass)
    ? (value as WishlistFontClass)
    : "font-sans";
}

export function normalizeWishlistItemBorderClass(value: string) {
  const normalizedValue = LEGACY_BORDER_DEFAULTS[value] || value;

  return ALLOWED_ITEM_BORDER_CLASSES.includes(
    normalizedValue as (typeof ALLOWED_ITEM_BORDER_CLASSES)[number],
  )
    ? normalizedValue
    : "rounded-lg border-solid";
}

export function getWishlistAppearancePresentation(
  appearance: WishlistAppearance,
) {
  const resolvedAppearance = resolveWishlistAppearance(appearance);

  return {
    raw: appearance,
    resolved: resolvedAppearance,
    primaryColor: resolvedAppearance.primaryColor,
    fontClass: normalizeWishlistFontClass(
      getAppearanceString(appearance, "font", "font-sans"),
    ),
    itemBorderClass: normalizeWishlistItemBorderClass(
      getAppearanceString(appearance, "itemBorder", "rounded-lg"),
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

export async function getWishlistPresentation({
  username,
  viewerUserId,
  searchParams,
}: {
  username: string;
  viewerUserId?: string;
  searchParams: WishlistSearchParams;
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
  const itemWhere = buildWishlistItemWhere(
    searchParams,
    relationship.canViewPrivateItems,
  );
  const orderBy = buildWishlistItemOrderBy(searchParams.sort);

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        where: itemWhere,
        orderBy,
        include: {
          category: true,
        },
      },
    },
  });

  if (!wishlist) {
    return null;
  }

  const appearance = (wishlist.appearance as WishlistAppearance) || {};
  const appearancePresentation = getWishlistAppearancePresentation(appearance);

  return {
    user,
    wishlist,
    relationship,
    itemWhere,
    hasActiveFilters: hasActiveWishlistFilters(searchParams),
    maxPriceOverall: getMaxWishlistItemPrice(wishlist.items),
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
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      wishlist: {
        include: {
          items: {
            where: { isPrivate: false },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          },
        },
      },
    },
  });

  if (!user?.wishlist) {
    return null;
  }

  const appearance = (user.wishlist.appearance as WishlistAppearance) || {};
  const selectedWidgetItems = user.wishlist.items.filter(
    (item) => item.showInWidget,
  );
  const displayItems =
    selectedWidgetItems.length > 0
      ? selectedWidgetItems.slice(0, 5)
      : user.wishlist.items.slice(0, 5);

  return {
    user,
    displayItems,
    profileUrl: `/${locale}/${username}`,
    appearance: getWishlistAppearancePresentation(appearance),
    widget: getWishlistWidgetPresentation(appearance),
  };
}
