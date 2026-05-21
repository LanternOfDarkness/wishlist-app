import {
  getWishlistAppearancePresentation,
  getWishlistAppearanceRecord,
  getWishlistWidgetPresentation,
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
  getWishlistAppearancePresentation,
  getWishlistWidgetPresentation,
  hasActiveWishlistFilters,
  type WishlistSearchParams,
};

type ViewerRelationshipUser = {
  id: string;
  followers: Array<{ followerId: string }>;
  following: Array<{ followingId: string }>;
};

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

  const appearance = getWishlistAppearanceRecord(wishlist.appearance);
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

  const appearance = getWishlistAppearanceRecord(user.wishlist.appearance);
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
