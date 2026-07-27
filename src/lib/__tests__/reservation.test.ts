import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeItem {
  id: string;
  price: number | null;
  isReserved: boolean;
  isArchived: boolean;
  isPrivate: boolean;
  wishlistId: string;
}

interface FakeWishlist {
  id: string;
  isPublic: boolean;
  shareToken: string | null;
  user: {
    id: string;
    followers: Array<{ followerId: string }>;
    following: Array<{ followingId: string }>;
  };
}

interface FakePledge {
  id: string;
  itemId: string;
  mode: string;
  amount: number | null;
  userId: string | null | undefined;
  guestName: string | undefined;
  isAnonymous: boolean;
}

const { fakeDb, prismaMock } = vi.hoisted(() => {
  const items = new Map<string, FakeItem>();
  const wishlists = new Map<string, FakeWishlist>();
  let pledges: FakePledge[] = [];
  let pledgeCounter = 0;

  function reset() {
    items.clear();
    wishlists.clear();
    pledges = [];
    pledgeCounter = 0;
  }

  const itemApi = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const record = items.get(where.id);
      if (!record) return null;
      const wishlist = wishlists.get(record.wishlistId) ?? null;
      return { ...record, wishlist };
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; isReserved?: boolean };
      data: Partial<FakeItem>;
    }) => {
      const record = items.get(where.id);
      if (!record) return { count: 0 };
      if (
        where.isReserved !== undefined &&
        record.isReserved !== where.isReserved
      ) {
        return { count: 0 };
      }
      Object.assign(record, data);
      return { count: 1 };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeItem>;
    }) => {
      const record = items.get(where.id);
      if (!record) throw new Error("not found");
      Object.assign(record, data);
      return { ...record };
    },
  };

  const pledgeApi = {
    create: async ({ data }: { data: Omit<FakePledge, "id"> }) => {
      pledgeCounter += 1;
      const record: FakePledge = { id: `pledge-${pledgeCounter}`, ...data };
      pledges.push(record);
      return { id: record.id };
    },
    aggregate: async ({
      where,
    }: {
      where: { itemId: string; mode: string };
    }) => {
      const sum = pledges
        .filter((p) => p.itemId === where.itemId && p.mode === where.mode)
        .reduce((total, p) => total + (p.amount ?? 0), 0);
      return { _sum: { amount: pledges.length > 0 ? sum : null } };
    },
  };

  const prismaMock = {
    item: itemApi,
    pledge: pledgeApi,
    $transaction: async (
      callback: (tx: { item: typeof itemApi; pledge: typeof pledgeApi }) => unknown,
    ) => callback({ item: itemApi, pledge: pledgeApi }),
  };

  return {
    fakeDb: { items, wishlists, get pledges() { return pledges; }, reset },
    prismaMock,
  };
});

vi.mock("../prisma", () => ({ prisma: prismaMock }));

import { createReservation } from "../reservation";

const OWNER_ID = "owner-1";

function seedPublicItem(overrides: Partial<FakeItem> = {}) {
  fakeDb.wishlists.set("wishlist-1", {
    id: "wishlist-1",
    isPublic: true,
    shareToken: null,
    user: { id: OWNER_ID, followers: [], following: [] },
  });
  fakeDb.items.set("item-1", {
    id: "item-1",
    price: 100,
    isReserved: false,
    isArchived: false,
    isPrivate: false,
    wishlistId: "wishlist-1",
    ...overrides,
  });
}

beforeEach(() => {
  fakeDb.reset();
});

describe("createReservation — visibility & ownership guards", () => {
  it("rejects a non-existent item", async () => {
    const result = await createReservation(
      { itemId: "missing", mode: "full" },
      null,
    );
    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("rejects reserving an item on a private wishlist without access", async () => {
    fakeDb.wishlists.set("wishlist-1", {
      id: "wishlist-1",
      isPublic: false,
      shareToken: "secret",
      user: { id: OWNER_ID, followers: [], following: [] },
    });
    fakeDb.items.set("item-1", {
      id: "item-1",
      price: 100,
      isReserved: false,
      isArchived: false,
      isPrivate: false,
      wishlistId: "wishlist-1",
    });

    const result = await createReservation(
      { itemId: "item-1", mode: "full" },
      "stranger",
    );
    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("allows reserving via a valid share key on a private wishlist", async () => {
    fakeDb.wishlists.set("wishlist-1", {
      id: "wishlist-1",
      isPublic: false,
      shareToken: "secret",
      user: { id: OWNER_ID, followers: [], following: [] },
    });
    fakeDb.items.set("item-1", {
      id: "item-1",
      price: 100,
      isReserved: false,
      isArchived: false,
      isPrivate: false,
      wishlistId: "wishlist-1",
    });

    const result = await createReservation(
      { itemId: "item-1", mode: "full", shareKey: "secret" },
      null,
    );
    expect(result.success).toBe(true);
  });

  it("rejects a private item for a viewer who is not a mutual follower", async () => {
    seedPublicItem({ isPrivate: true });

    const result = await createReservation(
      { itemId: "item-1", mode: "full" },
      "stranger",
    );
    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("allows a mutual follower to reserve a private item (characterization, pre-Phase-1)", async () => {
    fakeDb.wishlists.set("wishlist-1", {
      id: "wishlist-1",
      isPublic: true,
      shareToken: null,
      user: {
        id: OWNER_ID,
        followers: [{ followerId: "friend" }],
        following: [{ followingId: "friend" }],
      },
    });
    fakeDb.items.set("item-1", {
      id: "item-1",
      price: 100,
      isReserved: false,
      isArchived: false,
      isPrivate: true,
      wishlistId: "wishlist-1",
    });

    const result = await createReservation(
      { itemId: "item-1", mode: "full" },
      "friend",
    );
    expect(result.success).toBe(true);
  });

  it("rejects the owner reserving their own item", async () => {
    seedPublicItem();

    const result = await createReservation(
      { itemId: "item-1", mode: "full" },
      OWNER_ID,
    );
    expect(result).toEqual({
      success: false,
      error: "You cannot reserve your own item",
    });
  });

  it("rejects an archived item", async () => {
    seedPublicItem({ isArchived: true });

    const result = await createReservation(
      { itemId: "item-1", mode: "full" },
      "viewer",
    );
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
    expect(fakeDb.items.get("item-1")?.isReserved).toBe(true);
    expect(fakeDb.pledges).toHaveLength(1);
  });

  it("rejects a second full reservation attempt once the item is taken", async () => {
    seedPublicItem();

    const first = await createReservation(
      { itemId: "item-1", mode: "full" },
      "viewer-a",
    );
    const second = await createReservation(
      { itemId: "item-1", mode: "full" },
      "viewer-b",
    );

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

    await createReservation(
      { itemId: "item-1", mode: "partial", amount: 30 },
      "viewer-a",
    );
    const second = await createReservation(
      { itemId: "item-1", mode: "partial", amount: 40 },
      "viewer-b",
    );

    expect(second.success).toBe(true);
    expect(fakeDb.pledges).toHaveLength(2);
    expect(fakeDb.items.get("item-1")?.isReserved).toBe(false);
  });

  it("marks the item reserved once pledges reach the price", async () => {
    seedPublicItem({ price: 100 });

    await createReservation(
      { itemId: "item-1", mode: "partial", amount: 60 },
      "viewer-a",
    );
    await createReservation(
      { itemId: "item-1", mode: "partial", amount: 40 },
      "viewer-b",
    );

    expect(fakeDb.items.get("item-1")?.isReserved).toBe(true);
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
    expect(fakeDb.pledges[0]).toMatchObject({
      guestName: "A Friend",
      userId: undefined,
    });
  });

  it("allows a guest to reserve without providing a name", async () => {
    seedPublicItem();

    const result = await createReservation(
      { itemId: "item-1", mode: "full" },
      null,
    );

    expect(result.success).toBe(true);
  });
});
