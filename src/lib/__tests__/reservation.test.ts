import { beforeEach, describe, expect, it } from "vitest";

import { setTestRepository } from "../repository";
import { InMemoryWishlistRepository } from "../repository/in-memory-adapter";
import type { ItemData, UserProfile, WishlistData } from "../repository/types";
import { createReservation } from "../reservation";

const OWNER_ID = "owner-1";

function makeUser(id: string): UserProfile {
  return {
    id,
    name: "Test User",
    email: `${id}@example.com`,
    emailVerified: null,
    image: null,
    username: id,
    createdAt: new Date(),
  };
}

function makeWishlist(overrides: Partial<WishlistData> = {}): WishlistData {
  return {
    id: "wishlist-1",
    title: "Test Wishlist",
    description: null,
    slug: "wishlist-1",
    isPublic: true,
    shareToken: null,
    appearance: {},
    userId: OWNER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeItem(overrides: Partial<ItemData> = {}): ItemData {
  return {
    id: "item-1",
    name: "Bike",
    url: null,
    imageUrl: null,
    price: 100,
    currency: "UAH",
    priority: 3,
    isReserved: false,
    isPrivate: false,
    isArchived: false,
    showInWidget: false,
    wishlistId: "wishlist-1",
    categoryId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

let repo: InMemoryWishlistRepository;

function seedPublicItem(overrides: Partial<ItemData> = {}) {
  repo.users.set(OWNER_ID, makeUser(OWNER_ID));
  repo.wishlists.set("wishlist-1", makeWishlist());
  repo.items.set("item-1", makeItem(overrides));
}

beforeEach(() => {
  repo = new InMemoryWishlistRepository();
  setTestRepository(repo);
});

describe("createReservation — visibility & ownership guards", () => {
  it("rejects a non-existent item", async () => {
    const result = await createReservation({ itemId: "missing", mode: "full" }, null);
    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("rejects reserving an item on a private wishlist without access", async () => {
    repo.users.set(OWNER_ID, makeUser(OWNER_ID));
    repo.wishlists.set("wishlist-1", makeWishlist({ isPublic: false, shareToken: "secret" }));
    repo.items.set("item-1", makeItem());

    const result = await createReservation({ itemId: "item-1", mode: "full" }, "stranger");
    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("allows reserving via a valid share key on a private wishlist", async () => {
    repo.users.set(OWNER_ID, makeUser(OWNER_ID));
    repo.wishlists.set("wishlist-1", makeWishlist({ isPublic: false, shareToken: "secret" }));
    repo.items.set("item-1", makeItem());

    const result = await createReservation(
      { itemId: "item-1", mode: "full", shareKey: "secret" },
      null,
    );
    expect(result.success).toBe(true);
  });

  it("allows a mutual follower to reserve a private item", async () => {
    repo.users.set(OWNER_ID, makeUser(OWNER_ID));
    repo.wishlists.set("wishlist-1", makeWishlist());
    repo.items.set("item-1", makeItem({ isPrivate: true }));
    repo.follows.set("friend:owner", { followerId: "friend", followingId: OWNER_ID });
    repo.follows.set("owner:friend", { followerId: OWNER_ID, followingId: "friend" });

    const result = await createReservation({ itemId: "item-1", mode: "full" }, "friend");
    expect(result.success).toBe(true);
  });

  it("rejects a private item for a viewer who is not a mutual follower", async () => {
    seedPublicItem({ isPrivate: true });

    const result = await createReservation({ itemId: "item-1", mode: "full" }, "stranger");
    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("rejects the owner reserving their own item", async () => {
    seedPublicItem();

    const result = await createReservation({ itemId: "item-1", mode: "full" }, OWNER_ID);
    expect(result).toEqual({
      success: false,
      error: "You cannot reserve your own item",
    });
  });

  it("rejects an archived item", async () => {
    seedPublicItem({ isArchived: true });

    const result = await createReservation({ itemId: "item-1", mode: "full" }, "viewer");
    expect(result).toEqual({ success: false, error: "Item not found" });
  });
});

describe("createReservation — full reservation race safety", () => {
  it("lets exactly one of two concurrent full reservations succeed", async () => {
    seedPublicItem();

    const [first, second] = await Promise.all([
      createReservation({ itemId: "item-1", mode: "full" }, "viewer-a"),
      createReservation({ itemId: "item-1", mode: "full" }, "viewer-b"),
    ]);

    const successes = [first, second].filter((r) => r.success);
    expect(successes).toHaveLength(1);
    expect(repo.items.get("item-1")?.isReserved).toBe(true);
  });

  it("rejects a second full reservation attempt once the item is taken", async () => {
    seedPublicItem();

    const first = await createReservation({ itemId: "item-1", mode: "full" }, "viewer-a");
    const second = await createReservation({ itemId: "item-1", mode: "full" }, "viewer-b");

    expect(first.success).toBe(true);
    expect(second).toEqual({
      success: false,
      error: "Item is already reserved",
    });
  });
});

describe("createReservation — partial pledges", () => {
  it("accumulates partial pledges toward the item price", async () => {
    seedPublicItem({ price: 100 });

    await createReservation({ itemId: "item-1", mode: "partial", amount: 30 }, "viewer-a");
    const second = await createReservation(
      { itemId: "item-1", mode: "partial", amount: 40 },
      "viewer-b",
    );

    expect(second.success).toBe(true);
    expect(repo.items.get("item-1")?.isReserved).toBe(false);
  });

  it("marks the item reserved once pledges reach the price", async () => {
    seedPublicItem({ price: 100 });

    await createReservation({ itemId: "item-1", mode: "partial", amount: 60 }, "viewer-a");
    await createReservation({ itemId: "item-1", mode: "partial", amount: 40 }, "viewer-b");

    expect(repo.items.get("item-1")?.isReserved).toBe(true);
  });

  it("rejects a partial pledge once the item is already reserved", async () => {
    seedPublicItem({ price: 100, isReserved: true });

    const result = await createReservation(
      { itemId: "item-1", mode: "partial", amount: 10 },
      "viewer-a",
    );
    expect(result).toEqual({
      success: false,
      error: "Item is already reserved",
    });
  });

  it("rejects a partial pledge on an item without a price target", async () => {
    seedPublicItem({ price: null });

    const result = await createReservation(
      { itemId: "item-1", mode: "partial", amount: 10 },
      "viewer-a",
    );
    expect(result).toEqual({
      success: false,
      error: "This item does not support partial contributions",
    });
  });

  it.each([0, -5, undefined, NaN])(
    "rejects an invalid contribution amount: %s",
    async (amount) => {
      seedPublicItem({ price: 100 });

      const result = await createReservation(
        { itemId: "item-1", mode: "partial", amount },
        "viewer-a",
      );
      expect(result).toEqual({
        success: false,
        error: "A valid contribution amount is required",
      });
    },
  );
});

describe("createReservation — guest access", () => {
  it("allows an unauthenticated guest to reserve fully", async () => {
    seedPublicItem();

    const result = await createReservation(
      { itemId: "item-1", mode: "full", guestName: "A Friend" },
      null,
    );

    expect(result.success).toBe(true);
    expect([...repo.pledges.values()][0]).toMatchObject({
      guestName: "A Friend",
      userId: null,
    });
  });

  it("allows a guest to reserve without providing a name", async () => {
    seedPublicItem();

    const result = await createReservation({ itemId: "item-1", mode: "full" }, null);

    expect(result.success).toBe(true);
  });
});
