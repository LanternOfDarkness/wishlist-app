import { describe, expect, it } from "vitest";

import { hasActiveWishlistFilters } from "../wishlist-filter-state";
import {
  getMaxWishlistItemPrice,
  getViewerRelationship,
  getWishlistAppearancePresentation,
  getWishlistWidgetPresentation,
  buildWishlistPresentation,
  buildEmbedWishlistPresentation,
  type WishlistPresentationInput,
  type EmbedPresentationInput,
} from "../wishlist-presentation";

describe("wishlist presentation helpers", () => {
  it("resolves viewer relationship for owner, follower, and mutual follower", () => {
    const user = {
      id: "owner",
      followers: [{ followerId: "viewer" }],
      following: [{ followingId: "viewer" }],
    };

    expect(getViewerRelationship(user, "owner")).toMatchObject({
      isOwner: true,
      canViewPrivateItems: true,
    });
    expect(getViewerRelationship(user, "viewer")).toEqual({
      isOwner: false,
      isFollowing: true,
      isMutualFollower: true,
      canViewPrivateItems: true,
    });
    expect(getViewerRelationship(user, "other")).toEqual({
      isOwner: false,
      isFollowing: false,
      isMutualFollower: false,
      canViewPrivateItems: false,
    });
  });

  it("reports active filters from search params", () => {
    expect(hasActiveWishlistFilters({})).toBe(false);
    expect(hasActiveWishlistFilters({ category: "cat-1" })).toBe(true);
    expect(hasActiveWishlistFilters({ minPrice: "0" })).toBe(true);
  });

  it("calculates a stable max price fallback", () => {
    expect(getMaxWishlistItemPrice([])).toBe(10000);
    expect(getMaxWishlistItemPrice([{ price: null }, { price: 0 }])).toBe(10000);
    expect(getMaxWishlistItemPrice([{ price: 20 }, { price: 150 }])).toBe(150);
  });

  it("normalizes appearance presentation values for both route adapters", () => {
    const presentation = getWishlistAppearancePresentation({
      font: "font-comic",
      itemBorder: "rounded-lg border-dashed",
      welcomeMessage: "Hello",
      favoriteCurrencies: ["UAH", 123, "EUR"],
    });

    expect(presentation.fontClass).toBe("font-comic");
    expect(presentation.itemBorderClass).toBe("rounded-lg border-dashed");
    expect(presentation.welcomeMessage).toBe("Hello");
    expect(presentation.favoriteCurrencies).toEqual(["UAH", "EUR"]);
  });

  it("normalizes widget presentation values", () => {
    expect(
      getWishlistWidgetPresentation({
        widgetLayout: "list",
        widgetItemSize: 40,
      }),
    ).toEqual({
      widgetLayout: "list",
      widgetItemSize: 70,
    });
    expect(
      getWishlistWidgetPresentation({
        widgetLayout: "unknown",
        widgetItemSize: 500,
      }),
    ).toEqual({
      widgetLayout: "grid",
      widgetItemSize: 160,
    });
  });
});

describe("buildWishlistPresentation", () => {
  const viewerUser = {
    id: "user-1",
    name: "Test User",
    image: null,
    username: "testuser",
    createdAt: new Date("2025-01-01"),
    categories: [{ id: "cat-1", name: "Books", userId: "user-1", createdAt: new Date() }],
    followers: [{ followerId: "follower-1" }],
    following: [{ followingId: "other-1" }],
  };

  const items = [
    {
      id: "item-1", name: "Book A", url: null, imageUrl: null,
      price: 25, currency: "USD", priority: 3,
      isReserved: false, isPrivate: false, showInWidget: true,
      category: { id: "cat-1", name: "Books" },
    },
    {
      id: "item-2", name: "Book B", url: null, imageUrl: null,
      price: 15, currency: "USD", priority: 1,
      isReserved: false, isPrivate: true, showInWidget: false,
      category: { id: "cat-1", name: "Books" },
    },
  ];

  const wishlistResult = {
    wishlist: { id: "w-1", title: "My Wishlist", slug: "my-wishlist", appearance: { font: "font-serif" } },
    items: items as any,
    maxPrice: 25,
  };

  it("builds presentation with active filters", () => {
    const relationship = getViewerRelationship(viewerUser, "viewer");
    const result = buildWishlistPresentation({
      viewerUser,
      wishlistResult: wishlistResult as WishlistPresentationInput["wishlistResult"],
      relationship,
      searchParams: { category: "cat-1" },
    });

    expect(result.user.username).toBe("testuser");
    expect(result.wishlist.id).toBe("w-1");
    expect(result.wishlist.items).toHaveLength(2);
    expect(result.relationship.canViewPrivateItems).toBe(false);
    expect(result.hasActiveFilters).toBe(true);
    expect(result.maxPriceOverall).toBe(25);
    expect(result.appearance.fontClass).toBe("font-serif");
  });

  it("builds presentation with owner relationship showing private items", () => {
    const relationship = getViewerRelationship(viewerUser, "user-1");
    const result = buildWishlistPresentation({
      viewerUser,
      wishlistResult: wishlistResult as WishlistPresentationInput["wishlistResult"],
      relationship,
      searchParams: {},
    });

    expect(result.relationship.isOwner).toBe(true);
    expect(result.relationship.canViewPrivateItems).toBe(true);
    expect(result.hasActiveFilters).toBe(false);
  });

  it("computes maxPriceOverall from item prices", () => {
    const relationship = getViewerRelationship(viewerUser, "viewer");
    const result = buildWishlistPresentation({
      viewerUser,
      wishlistResult: {
        ...wishlistResult,
        maxPrice: 25,
      } as WishlistPresentationInput["wishlistResult"],
      relationship,
      searchParams: {},
    });

    expect(result.maxPriceOverall).toBe(25);
  });

  it("falls back to 10000 for max price when no items have prices", () => {
    const relationship = getViewerRelationship(viewerUser, "viewer");
    const result = buildWishlistPresentation({
      viewerUser,
      wishlistResult: {
        wishlist: wishlistResult.wishlist,
        items: [],
        maxPrice: 10000,
      },
      relationship,
      searchParams: {},
    });

    expect(result.maxPriceOverall).toBe(10000);
  });

  it("passes appearance fields through", () => {
    const relationship = getViewerRelationship(viewerUser, "viewer");
    const result = buildWishlistPresentation({
      viewerUser,
      wishlistResult: {
        ...wishlistResult,
        wishlist: { ...wishlistResult.wishlist, appearance: { font: "font-comic", welcomeMessage: "Hello!" } },
      } as WishlistPresentationInput["wishlistResult"],
      relationship,
      searchParams: {},
    });

    expect(result.appearance.fontClass).toBe("font-comic");
    expect(result.appearance.welcomeMessage).toBe("Hello!");
  });
});

describe("buildEmbedWishlistPresentation", () => {
  it("selects widget items when showInWidget is set", () => {
    const result = buildEmbedWishlistPresentation({
      embedData: {
        user: { id: "u-1", name: "User", image: null, username: "user" },
        wishlist: { appearance: {} },
        items: [
          { id: "i-1", name: "A", price: 10, currency: "USD", url: null, imageUrl: null, showInWidget: true },
          { id: "i-2", name: "B", price: 20, currency: "USD", url: null, imageUrl: null, showInWidget: false },
          { id: "i-3", name: "C", price: 30, currency: "USD", url: null, imageUrl: null, showInWidget: true },
        ],
      },
      locale: "en",
      username: "user",
    });

    expect(result.displayItems).toHaveLength(2);
    expect(result.displayItems[0].name).toBe("A");
    expect(result.displayItems[1].name).toBe("C");
    expect(result.profileUrl).toBe("/en/user");
    expect(result.widget.widgetLayout).toBe("grid");
  });

  it("falls back to first 5 items when none are widget-selected", () => {
    const result = buildEmbedWishlistPresentation({
      embedData: {
        user: { id: "u-1", name: "User", image: null, username: "user" },
        wishlist: { appearance: {} },
        items: [
          { id: "i-1", name: "A", price: 10, currency: "USD", url: null, imageUrl: null, showInWidget: false },
          { id: "i-2", name: "B", price: 20, currency: "USD", url: null, imageUrl: null, showInWidget: false },
        ],
      },
      locale: "en",
      username: "user",
    });

    expect(result.displayItems).toHaveLength(2);
  });

  it("caps display items at 5", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `i-${i}`, name: `Item ${i}`, price: i, currency: "USD",
      url: null, imageUrl: null, showInWidget: true,
    }));

    const result = buildEmbedWishlistPresentation({
      embedData: {
        user: { id: "u-1", name: "User", image: null, username: "user" },
        wishlist: { appearance: {} },
        items,
      },
      locale: "en",
      username: "user",
    });

    expect(result.displayItems).toHaveLength(5);
  });
});
