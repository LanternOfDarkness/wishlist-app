import {
  resolveWishlistAppearance,
  type WishlistAppearance,
} from "./wishlist-appearance";
import { getRepository } from "./repository";
import type {
  ViewerPageUser,
} from "./repository";
import {
  buildWishlistItemOrderBy,
  buildWishlistItemWhere,
  hasActiveWishlistFilters,
  type WishlistSearchParams,
} from "./wishlist-filter-state";

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

export interface WishlistPresentationInput {
  viewerUser: ViewerPageUser;
  wishlistResult: {
    wishlist: { id: string; title: string; slug: string; appearance: Record<string, unknown> };
    items: Array<{
      id: string; name: string; url: string | null; imageUrl: string | null;
      price: number | null; currency: string; priority: number;
      isReserved: boolean; isPrivate: boolean; showInWidget: boolean;
      category: { id: string; name: string } | null;
    }>;
    maxPrice: number;
  };
  relationship: ReturnType<typeof getViewerRelationship>;
  searchParams: WishlistSearchParams;
}

export function buildWishlistPresentation(input: WishlistPresentationInput) {
  const appearance = (input.wishlistResult.wishlist.appearance as WishlistAppearance) || {};
  const appearancePresentation = getWishlistAppearancePresentation(appearance);

  return {
    user: input.viewerUser,
    wishlist: {
      id: input.wishlistResult.wishlist.id,
      title: input.wishlistResult.wishlist.title,
      slug: input.wishlistResult.wishlist.slug,
      items: input.wishlistResult.items,
    },
    relationship: input.relationship,
    itemWhere: buildWishlistItemWhere(input.searchParams, input.relationship.canViewPrivateItems),
    hasActiveFilters: hasActiveWishlistFilters(input.searchParams),
    maxPriceOverall: getMaxWishlistItemPrice(input.wishlistResult.items),
    appearance: appearancePresentation,
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
  const repo = getRepository();
  const viewerUser = await repo.load({ type: "viewer-page-user", username });

  if (!viewerUser) {
    return null;
  }

  const relationship = getViewerRelationship(viewerUser, viewerUserId);

  const wishlistResult = await repo.load({
    type: "wishlist-presentation",
    userId: viewerUser.id,
    canViewPrivate: relationship.canViewPrivateItems,
    categories: searchParams.category ? [searchParams.category].flat() : undefined,
    currency: searchParams.currency || undefined,
    minPrice: searchParams.minPrice ? parseFloat(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : undefined,
    sort: searchParams.sort || undefined,
  });

  if (!wishlistResult) {
    return null;
  }

  return buildWishlistPresentation({
    viewerUser,
    wishlistResult,
    relationship,
    searchParams,
  });
}

export interface EmbedPresentationInput {
  embedData: {
    user: { id: string; name: string | null; image: string | null; username: string | null };
    wishlist: { appearance: Record<string, unknown> };
    items: Array<{
      id: string; name: string; price: number | null; currency: string;
      url: string | null; imageUrl: string | null; showInWidget: boolean;
    }>;
  };
  locale: string;
  username: string;
}

export function buildEmbedWishlistPresentation(input: EmbedPresentationInput) {
  const appearance = (input.embedData.wishlist.appearance as WishlistAppearance) || {};
  const selectedWidgetItems = input.embedData.items.filter(
    (item) => item.showInWidget,
  );
  const displayItems =
    selectedWidgetItems.length > 0
      ? selectedWidgetItems.slice(0, 5)
      : input.embedData.items.slice(0, 5);

  return {
    user: input.embedData.user,
    displayItems,
    profileUrl: `/${input.locale}/${input.username}`,
    appearance: getWishlistAppearancePresentation(appearance),
    widget: getWishlistWidgetPresentation(appearance),
  };
}

export async function getEmbedWishlistPresentation({
  locale,
  username,
}: {
  locale: string;
  username: string;
}) {
  const repo = getRepository();
  const embedData = await repo.load({ type: "embed-presentation", username });

  if (!embedData) {
    return null;
  }

  return buildEmbedWishlistPresentation({ embedData, locale, username });
}
