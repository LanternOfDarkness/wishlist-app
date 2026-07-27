import { timingSafeEqual } from "node:crypto";

/**
 * The single owner of the "who can see what" rule. Every surface that needs
 * to decide wishlist or item visibility goes through the functions here —
 * they take and return plain domain values (no Prisma types), so both
 * repository adapters and any other consumer (e.g. the dashboard settings
 * intake) apply the identical decision instead of hand-rolling their own copy.
 */

export type ViewerRelationshipUser = {
  id: string;
  followers: Array<{ followerId: string }>;
  following: Array<{ followingId: string }>;
};

export type ViewerRelationship = {
  isOwner: boolean;
  isFollowing: boolean;
  isMutualFollower: boolean;
  canViewPrivateItems: boolean;
};

export function getViewerRelationship(
  user: ViewerRelationshipUser,
  viewerUserId?: string,
): ViewerRelationship {
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

/**
 * Constant-time comparison of a viewer-supplied share key against the stored
 * token. Returns false for missing values or length mismatches without leaking
 * timing information about how much of the token matched.
 */
export function matchesShareToken(
  provided: string | undefined | null,
  actual: string | null,
): boolean {
  if (!provided || !actual) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const actualBuffer = Buffer.from(actual);

  if (providedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, actualBuffer);
}

export type WishlistAccess = {
  canViewWishlist: boolean;
  canViewPrivateItems: boolean;
};

/**
 * Whether a viewer may see the wishlist at all, and whether they may see its
 * private items. A share-link viewer is not an owner/mutual-follower, so
 * `canViewPrivateItems` stays false even though `canViewWishlist` is true —
 * the link exposes the list, not its private entries.
 */
export function resolveWishlistAccess(args: {
  wishlist: { isPublic: boolean; shareToken: string | null };
  relationship: ViewerRelationship;
  shareKey?: string | null;
}): WishlistAccess {
  const canViewWishlist =
    args.wishlist.isPublic ||
    args.relationship.canViewPrivateItems ||
    matchesShareToken(args.shareKey, args.wishlist.shareToken);

  return {
    canViewWishlist,
    canViewPrivateItems: args.relationship.canViewPrivateItems,
  };
}

export type ItemVisibilitySurface =
  | "wishlist-page"
  | "embed"
  | "widget-picker"
  | "dashboard";

/** What a given surface is allowed to show. No Prisma types. */
export type ItemVisibility = {
  includeArchived: boolean; // false everywhere today
  includePrivate: boolean;
  widgetOnly: boolean; // embed + widget picker
};

export function itemVisibilityFor(
  surface: ItemVisibilitySurface,
  access: WishlistAccess,
): ItemVisibility {
  switch (surface) {
    case "wishlist-page":
    case "dashboard":
      return {
        includeArchived: false,
        includePrivate: access.canViewPrivateItems,
        widgetOnly: false,
      };
    case "embed":
    case "widget-picker":
      // Neither surface carries a viewer identity, so private items are
      // never included regardless of what `access` says.
      return {
        includeArchived: false,
        includePrivate: false,
        widgetOnly: true,
      };
  }
}
