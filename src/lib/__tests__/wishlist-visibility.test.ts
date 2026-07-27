import { describe, expect, it } from "vitest";

import {
  getViewerRelationship,
  itemVisibilityFor,
  matchesShareToken,
  resolveWishlistAccess,
  type ViewerRelationship,
} from "../wishlist-visibility";

describe("getViewerRelationship", () => {
  const user = {
    id: "owner",
    followers: [{ followerId: "friend" }, { followerId: "fan" }],
    following: [{ followingId: "friend" }, { followingId: "idol" }],
  };

  it("recognizes the owner", () => {
    expect(getViewerRelationship(user, "owner")).toEqual({
      isOwner: true,
      isFollowing: false,
      isMutualFollower: false,
      canViewPrivateItems: true,
    });
  });

  it("recognizes a mutual follower (follows and is followed back)", () => {
    expect(getViewerRelationship(user, "friend")).toEqual({
      isOwner: false,
      isFollowing: true,
      isMutualFollower: true,
      canViewPrivateItems: true,
    });
  });

  it("does not grant private access to a one-directional follower (fan follows owner, owner doesn't follow back)", () => {
    expect(getViewerRelationship(user, "fan")).toEqual({
      isOwner: false,
      isFollowing: true,
      isMutualFollower: false,
      canViewPrivateItems: false,
    });
  });

  it("does not grant private access when the owner follows the viewer but the viewer doesn't follow back", () => {
    expect(getViewerRelationship(user, "idol")).toEqual({
      isOwner: false,
      isFollowing: false,
      isMutualFollower: false,
      canViewPrivateItems: false,
    });
  });

  it("treats a stranger as having no relationship", () => {
    expect(getViewerRelationship(user, "stranger")).toEqual({
      isOwner: false,
      isFollowing: false,
      isMutualFollower: false,
      canViewPrivateItems: false,
    });
  });

  it("treats an anonymous viewer (no viewerUserId) as a stranger", () => {
    expect(getViewerRelationship(user, undefined)).toEqual({
      isOwner: false,
      isFollowing: false,
      isMutualFollower: false,
      canViewPrivateItems: false,
    });
  });
});

describe("matchesShareToken", () => {
  it("returns false for missing values", () => {
    expect(matchesShareToken(undefined, "token")).toBe(false);
    expect(matchesShareToken(null, "token")).toBe(false);
    expect(matchesShareToken("token", null)).toBe(false);
  });

  it("returns true only for an exact match", () => {
    expect(matchesShareToken("secret", "secret")).toBe(true);
    expect(matchesShareToken("secret", "secreX")).toBe(false);
  });
});

describe("resolveWishlistAccess", () => {
  const strangerRelationship: ViewerRelationship = {
    isOwner: false,
    isFollowing: false,
    isMutualFollower: false,
    canViewPrivateItems: false,
  };
  const ownerRelationship: ViewerRelationship = {
    isOwner: true,
    isFollowing: false,
    isMutualFollower: false,
    canViewPrivateItems: true,
  };

  it("grants access to a public wishlist for a stranger, but never private items", () => {
    expect(
      resolveWishlistAccess({
        wishlist: { isPublic: true, shareToken: null },
        relationship: strangerRelationship,
      }),
    ).toEqual({ canViewWishlist: true, canViewPrivateItems: false });
  });

  it("denies access to a private wishlist for a stranger with no share key", () => {
    expect(
      resolveWishlistAccess({
        wishlist: { isPublic: false, shareToken: "secret" },
        relationship: strangerRelationship,
      }),
    ).toEqual({ canViewWishlist: false, canViewPrivateItems: false });
  });

  it("grants full access to a private wishlist for its owner", () => {
    expect(
      resolveWishlistAccess({
        wishlist: { isPublic: false, shareToken: "secret" },
        relationship: ownerRelationship,
      }),
    ).toEqual({ canViewWishlist: true, canViewPrivateItems: true });
  });

  it("grants wishlist access but NOT private-item access to a valid share-key visitor", () => {
    expect(
      resolveWishlistAccess({
        wishlist: { isPublic: false, shareToken: "secret" },
        relationship: strangerRelationship,
        shareKey: "secret",
      }),
    ).toEqual({ canViewWishlist: true, canViewPrivateItems: false });
  });

  it("denies access for an invalid share key", () => {
    expect(
      resolveWishlistAccess({
        wishlist: { isPublic: false, shareToken: "secret" },
        relationship: strangerRelationship,
        shareKey: "wrong",
      }),
    ).toEqual({ canViewWishlist: false, canViewPrivateItems: false });
  });
});

describe("itemVisibilityFor", () => {
  const canViewPrivate = { canViewWishlist: true, canViewPrivateItems: true };
  const cannotViewPrivate = { canViewWishlist: true, canViewPrivateItems: false };

  it("wishlist-page: includes private items only when access grants it, never archived", () => {
    expect(itemVisibilityFor("wishlist-page", canViewPrivate)).toEqual({
      includeArchived: false,
      includePrivate: true,
      widgetOnly: false,
    });
    expect(itemVisibilityFor("wishlist-page", cannotViewPrivate)).toEqual({
      includeArchived: false,
      includePrivate: false,
      widgetOnly: false,
    });
  });

  it("dashboard: the owner's own view includes private items, never archived", () => {
    expect(itemVisibilityFor("dashboard", canViewPrivate)).toEqual({
      includeArchived: false,
      includePrivate: true,
      widgetOnly: false,
    });
  });

  it("embed: no viewer identity, so never private and never archived regardless of access", () => {
    expect(itemVisibilityFor("embed", canViewPrivate)).toEqual({
      includeArchived: false,
      includePrivate: false,
      widgetOnly: true,
    });
    expect(itemVisibilityFor("embed", cannotViewPrivate)).toEqual({
      includeArchived: false,
      includePrivate: false,
      widgetOnly: true,
    });
  });

  it("widget-picker: never private, never archived, regardless of access", () => {
    expect(itemVisibilityFor("widget-picker", canViewPrivate)).toEqual({
      includeArchived: false,
      includePrivate: false,
      widgetOnly: true,
    });
  });
});
