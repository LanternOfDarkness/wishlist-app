import { describe, expect, it } from "vitest";

import {
  buildWishlistItemOrderBy,
  buildWishlistItemWhere,
  getMaxWishlistItemPrice,
  getViewerRelationship,
  getWishlistAppearancePresentation,
  getWishlistWidgetPresentation,
  hasActiveWishlistFilters,
} from "../wishlist-presentation";

describe("wishlist presentation helpers", () => {
  it("builds item filters from search params and hides private items", () => {
    expect(
      buildWishlistItemWhere(
        {
          category: ["cat-1", "cat-2"],
          currency: "UAH",
          minPrice: "10",
          maxPrice: "200",
        },
        false,
      ),
    ).toEqual({
      categoryId: { in: ["cat-1", "cat-2"] },
      currency: "UAH",
      price: { gte: 10, lte: 200 },
      isPrivate: false,
    });
  });

  it("omits private filter for viewers who can see private items", () => {
    expect(buildWishlistItemWhere({}, true)).toEqual({});
  });

  it("builds item order from supported sort modes", () => {
    expect(buildWishlistItemOrderBy("price_asc")).toEqual([{ price: "asc" }]);
    expect(buildWishlistItemOrderBy("price_desc")).toEqual([{ price: "desc" }]);
    expect(buildWishlistItemOrderBy("newest")).toEqual([{ createdAt: "desc" }]);
    expect(buildWishlistItemOrderBy("unknown")).toEqual([
      { priority: "desc" },
      { createdAt: "desc" },
    ]);
  });

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
