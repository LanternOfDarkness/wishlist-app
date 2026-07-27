import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    wishlist: { findUnique: vi.fn() },
  },
}));

import {
  buildWishlistItemOrderBy,
  buildWishlistItemWhere,
  getEmbedWishlistPresentation,
  getMaxWishlistItemPrice,
  getViewerRelationship,
  getWishlistAppearancePresentation,
  getWishlistPresentation,
  getWishlistWidgetPresentation,
  hasActiveWishlistFilters,
  matchesShareToken,
} from "../wishlist-presentation";
import { prisma } from "../prisma";

const mockUserFind = prisma.user.findUnique as unknown as Mock;
const mockWishlistFind = prisma.wishlist.findUnique as unknown as Mock;

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
      isArchived: false,
    });
  });

  it("omits private filter for viewers who can see private items", () => {
    expect(buildWishlistItemWhere({}, true)).toEqual({ isArchived: false });
  });

  it("always excludes archived items, even for the owner", () => {
    expect(buildWishlistItemWhere({}, true)).toMatchObject({
      isArchived: false,
    });
    expect(buildWishlistItemWhere({}, false)).toMatchObject({
      isArchived: false,
    });
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

describe("matchesShareToken", () => {
  it("returns false for missing values", () => {
    expect(matchesShareToken(undefined, "token")).toBe(false);
    expect(matchesShareToken("token", null)).toBe(false);
    expect(matchesShareToken("", "")).toBe(false);
  });

  it("returns false for a length mismatch without throwing", () => {
    expect(matchesShareToken("short", "a-much-longer-token")).toBe(false);
  });

  it("returns true only for an exact match", () => {
    expect(matchesShareToken("secret-token", "secret-token")).toBe(true);
    expect(matchesShareToken("secret-token", "secret-tokeX")).toBe(false);
  });
});

describe("getWishlistPresentation visibility gate", () => {
  const OWNER = {
    id: "owner",
    username: "owner",
    categories: [],
    followers: [] as Array<{ followerId: string }>,
    following: [] as Array<{ followingId: string }>,
  };

  function mockWishlist(overrides: Record<string, unknown> = {}) {
    mockWishlistFind.mockResolvedValue({
      id: "wishlist-1",
      userId: "owner",
      isPublic: false,
      shareToken: "secret-token",
      appearance: null,
      items: [],
      ...overrides,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFind.mockResolvedValue({ ...OWNER });
  });

  async function present(args: {
    viewerUserId?: string;
    shareKey?: string;
  }) {
    return getWishlistPresentation({
      username: "owner",
      searchParams: {},
      ...args,
    });
  }

  it("shows a public wishlist to an anonymous viewer", async () => {
    mockWishlist({ isPublic: true, shareToken: null });
    expect(await present({})).not.toBeNull();
  });

  it("hides a private wishlist from an anonymous or non-follower viewer", async () => {
    mockWishlist();
    expect(await present({})).toBeNull();
    expect(await present({ viewerUserId: "stranger" })).toBeNull();
  });

  it("shows a private wishlist to the owner", async () => {
    mockWishlist();
    expect(await present({ viewerUserId: "owner" })).not.toBeNull();
  });

  it("shows a private wishlist to a mutual follower", async () => {
    mockUserFind.mockResolvedValue({
      ...OWNER,
      followers: [{ followerId: "friend" }],
      following: [{ followingId: "friend" }],
    });
    mockWishlist();
    expect(await present({ viewerUserId: "friend" })).not.toBeNull();
  });

  it("shows a private wishlist to anyone with the correct share key", async () => {
    mockWishlist();
    expect(await present({ shareKey: "secret-token" })).not.toBeNull();
    expect(await present({ shareKey: "wrong-token" })).toBeNull();
    expect(await present({})).toBeNull();
  });

  it("still hides private items from a share-link viewer", async () => {
    mockWishlist();
    const result = await present({ shareKey: "secret-token" });
    expect(result?.itemWhere).toMatchObject({ isPrivate: false });
  });

  it("excludes archived items even for the owner (characterization, pre-Phase-1)", async () => {
    mockWishlist();
    const result = await present({ viewerUserId: "owner" });
    expect(result?.itemWhere).toMatchObject({ isArchived: false });
  });

  it("excludes archived items for a mutual follower (characterization, pre-Phase-1)", async () => {
    mockUserFind.mockResolvedValue({
      ...OWNER,
      followers: [{ followerId: "friend" }],
      following: [{ followingId: "friend" }],
    });
    mockWishlist();
    const result = await present({ viewerUserId: "friend" });
    expect(result?.itemWhere).toMatchObject({ isArchived: false });
  });
});

describe("getWishlistPresentation reservation surprise-preservation", () => {
  const RESERVED_ITEM_BASE = {
    id: "item-1",
    name: "Bike",
    price: 100,
    currency: "UAH",
    isReserved: true,
    category: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFind.mockResolvedValue({
      id: "owner",
      username: "owner",
      categories: [],
      followers: [],
      following: [],
    });
  });

  it("omits reservation and pledge fields entirely from the owner's payload", async () => {
    mockWishlistFind.mockResolvedValue({
      id: "wishlist-1",
      userId: "owner",
      isPublic: true,
      shareToken: null,
      appearance: null,
      items: [
        {
          ...RESERVED_ITEM_BASE,
          pledges: [{ amount: 40 }, { amount: 60 }],
        },
      ],
    });

    const result = await getWishlistPresentation({
      username: "owner",
      viewerUserId: "owner",
      searchParams: {},
    });

    const item = result?.wishlist.items[0];
    expect(item).not.toHaveProperty("isReserved");
    expect(item).not.toHaveProperty("pledgedTotal");
    expect(item).not.toHaveProperty("progressRatio");
    expect(item).not.toHaveProperty("pledges");
  });

  it("computes an aggregate pledged total and progress ratio for a non-owner viewer", async () => {
    mockWishlistFind.mockResolvedValue({
      id: "wishlist-1",
      userId: "owner",
      isPublic: true,
      shareToken: null,
      appearance: null,
      items: [
        {
          ...RESERVED_ITEM_BASE,
          isReserved: false,
          pledges: [{ amount: 40 }, { amount: 20 }],
        },
      ],
    });

    const result = await getWishlistPresentation({
      username: "owner",
      viewerUserId: "stranger",
      searchParams: {},
    });

    const item = result?.wishlist.items[0];
    expect(item).toMatchObject({
      isReserved: false,
      pledgedTotal: 60,
      progressRatio: 0.6,
    });
    expect(item).not.toHaveProperty("pledges");
  });

  it("never exposes individual pledge rows (guest names/messages) to any viewer", async () => {
    mockWishlistFind.mockResolvedValue({
      id: "wishlist-1",
      userId: "owner",
      isPublic: true,
      shareToken: null,
      appearance: null,
      items: [
        {
          ...RESERVED_ITEM_BASE,
          pledges: [{ amount: 40 }],
        },
      ],
    });

    const ownerResult = await getWishlistPresentation({
      username: "owner",
      viewerUserId: "owner",
      searchParams: {},
    });
    const viewerResult = await getWishlistPresentation({
      username: "owner",
      viewerUserId: "stranger",
      searchParams: {},
    });

    expect(ownerResult?.wishlist.items[0]).not.toHaveProperty("pledges");
    expect(viewerResult?.wishlist.items[0]).not.toHaveProperty("pledges");
  });
});

describe("getEmbedWishlistPresentation visibility gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for a private wishlist", async () => {
    mockUserFind.mockResolvedValue({
      id: "owner",
      username: "owner",
      wishlist: { isPublic: false, appearance: null, items: [] },
    });
    expect(
      await getEmbedWishlistPresentation({ locale: "en", username: "owner" }),
    ).toBeNull();
  });

  it("returns a presentation for a public wishlist", async () => {
    mockUserFind.mockResolvedValue({
      id: "owner",
      username: "owner",
      wishlist: { isPublic: true, appearance: null, items: [] },
    });
    expect(
      await getEmbedWishlistPresentation({ locale: "en", username: "owner" }),
    ).not.toBeNull();
  });

  it("queries items excluding both private and archived (regression: archived items were leaking into the embed)", async () => {
    mockUserFind.mockResolvedValue({
      id: "owner",
      username: "owner",
      wishlist: { isPublic: true, appearance: null, items: [] },
    });

    await getEmbedWishlistPresentation({ locale: "en", username: "owner" });

    expect(mockUserFind).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          wishlist: expect.objectContaining({
            include: expect.objectContaining({
              items: expect.objectContaining({
                where: { isPrivate: false, isArchived: false },
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("never exposes isReserved, even on a public wishlist (embeds have no viewer identity)", async () => {
    mockUserFind.mockResolvedValue({
      id: "owner",
      username: "owner",
      wishlist: {
        isPublic: true,
        appearance: null,
        items: [
          {
            id: "item-1",
            name: "Bike",
            price: 100,
            currency: "UAH",
            isReserved: true,
            showInWidget: false,
          },
        ],
      },
    });

    const result = await getEmbedWishlistPresentation({
      locale: "en",
      username: "owner",
    });

    expect(result?.displayItems[0]).not.toHaveProperty("isReserved");
  });
});
