import { beforeEach, describe, expect, it } from "vitest";

import {
  getEmbedWishlistPresentation,
  getWishlistPresentation,
} from "../wishlist-presentation";
import { setTestRepository } from "../repository";
import { InMemoryWishlistRepository } from "../repository/in-memory-adapter";
import type { ItemData, UserProfile, WishlistData } from "../repository/types";

let repo: InMemoryWishlistRepository;

const OWNER_ID = "owner";

function makeUser(id: string, overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id,
    name: "Test User",
    email: `${id}@example.com`,
    emailVerified: null,
    image: null,
    username: id,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeWishlist(overrides: Partial<WishlistData> = {}): WishlistData {
  return {
    id: "wishlist-1",
    title: "Test Wishlist",
    description: null,
    slug: "wishlist-1",
    isPublic: false,
    shareToken: "secret-token",
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

beforeEach(() => {
  repo = new InMemoryWishlistRepository();
  setTestRepository(repo);
});

describe("getWishlistPresentation visibility gate", () => {
  function seedOwner(overrides: Partial<UserProfile> = {}) {
    repo.users.set(OWNER_ID, makeUser(OWNER_ID, overrides));
  }

  function seedWishlist(overrides: Partial<WishlistData> = {}) {
    repo.wishlists.set("wishlist-1", makeWishlist(overrides));
  }

  beforeEach(() => {
    seedOwner();
  });

  async function present(args: { viewerUserId?: string; shareKey?: string }) {
    return getWishlistPresentation({
      username: OWNER_ID,
      searchParams: {},
      ...args,
    });
  }

  it("shows a public wishlist to an anonymous viewer", async () => {
    seedWishlist({ isPublic: true, shareToken: null });
    expect(await present({})).not.toBeNull();
  });

  it("hides a private wishlist from an anonymous or non-follower viewer", async () => {
    seedWishlist();
    expect(await present({})).toBeNull();
    expect(await present({ viewerUserId: "stranger" })).toBeNull();
  });

  it("shows a private wishlist to the owner", async () => {
    seedWishlist();
    expect(await present({ viewerUserId: OWNER_ID })).not.toBeNull();
  });

  it("shows a private wishlist to a mutual follower", async () => {
    repo.follows.set("friend:owner", { followerId: "friend", followingId: OWNER_ID });
    repo.follows.set("owner:friend", { followerId: OWNER_ID, followingId: "friend" });
    seedWishlist();
    expect(await present({ viewerUserId: "friend" })).not.toBeNull();
  });

  it("shows a private wishlist to anyone with the correct share key", async () => {
    seedWishlist();
    expect(await present({ shareKey: "secret-token" })).not.toBeNull();
    expect(await present({ shareKey: "wrong-token" })).toBeNull();
    expect(await present({})).toBeNull();
  });

  it("still hides private items from a share-link viewer", async () => {
    seedWishlist();
    repo.items.set("item-1", makeItem({ isPrivate: true }));

    const result = await present({ shareKey: "secret-token" });

    expect(result?.wishlist.items).toHaveLength(0);
  });

  it("excludes archived items even for the owner", async () => {
    seedWishlist();
    repo.items.set("item-1", makeItem({ isArchived: true }));

    const result = await present({ viewerUserId: OWNER_ID });

    expect(result?.wishlist.items).toHaveLength(0);
  });

  it("excludes archived items for a mutual follower", async () => {
    repo.follows.set("friend:owner", { followerId: "friend", followingId: OWNER_ID });
    repo.follows.set("owner:friend", { followerId: OWNER_ID, followingId: "friend" });
    seedWishlist();
    repo.items.set("item-1", makeItem({ isArchived: true }));

    const result = await present({ viewerUserId: "friend" });

    expect(result?.wishlist.items).toHaveLength(0);
  });
});

describe("getWishlistPresentation reservation surprise-preservation", () => {
  beforeEach(() => {
    repo.users.set(OWNER_ID, makeUser(OWNER_ID));
    repo.wishlists.set("wishlist-1", makeWishlist({ isPublic: true, shareToken: null }));
  });

  it("omits reservation and pledge fields entirely from the owner's payload", async () => {
    repo.items.set("item-1", makeItem({ isReserved: true }));
    repo.pledges.set("pledge-1", {
      id: "pledge-1",
      itemId: "item-1",
      mode: "partial",
      amount: 40,
      isAnonymous: false,
    });

    const result = await getWishlistPresentation({
      username: OWNER_ID,
      viewerUserId: OWNER_ID,
      searchParams: {},
    });

    const item = result?.wishlist.items[0];
    expect(item).not.toHaveProperty("isReserved");
    expect(item).not.toHaveProperty("pledgedTotal");
    expect(item).not.toHaveProperty("progressRatio");
    expect(item).not.toHaveProperty("pledges");
  });

  it("computes an aggregate pledged total and progress ratio for a non-owner viewer", async () => {
    repo.items.set("item-1", makeItem({ isReserved: false }));
    repo.pledges.set("pledge-1", {
      id: "pledge-1",
      itemId: "item-1",
      mode: "partial",
      amount: 40,
      isAnonymous: false,
    });
    repo.pledges.set("pledge-2", {
      id: "pledge-2",
      itemId: "item-1",
      mode: "partial",
      amount: 20,
      isAnonymous: false,
    });

    const result = await getWishlistPresentation({
      username: OWNER_ID,
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
    repo.items.set("item-1", makeItem());
    repo.pledges.set("pledge-1", {
      id: "pledge-1",
      itemId: "item-1",
      mode: "partial",
      amount: 40,
      guestName: "A Friend",
      isAnonymous: false,
    });

    const ownerResult = await getWishlistPresentation({
      username: OWNER_ID,
      viewerUserId: OWNER_ID,
      searchParams: {},
    });
    const viewerResult = await getWishlistPresentation({
      username: OWNER_ID,
      viewerUserId: "stranger",
      searchParams: {},
    });

    expect(ownerResult?.wishlist.items[0]).not.toHaveProperty("pledges");
    expect(viewerResult?.wishlist.items[0]).not.toHaveProperty("pledges");
  });
});

describe("getEmbedWishlistPresentation visibility gate", () => {
  it("returns null for a private wishlist", async () => {
    repo.users.set(OWNER_ID, makeUser(OWNER_ID));
    repo.wishlists.set("wishlist-1", makeWishlist({ isPublic: false }));

    expect(
      await getEmbedWishlistPresentation({ locale: "en", username: OWNER_ID }),
    ).toBeNull();
  });

  it("returns a presentation for a public wishlist", async () => {
    repo.users.set(OWNER_ID, makeUser(OWNER_ID));
    repo.wishlists.set("wishlist-1", makeWishlist({ isPublic: true }));

    expect(
      await getEmbedWishlistPresentation({ locale: "en", username: OWNER_ID }),
    ).not.toBeNull();
  });

  it("excludes both private and archived items (regression: archived items were leaking into the embed)", async () => {
    repo.users.set(OWNER_ID, makeUser(OWNER_ID));
    repo.wishlists.set("wishlist-1", makeWishlist({ isPublic: true }));
    repo.items.set("item-public", makeItem({ id: "item-public", isPrivate: false, isArchived: false }));
    repo.items.set("item-private", makeItem({ id: "item-private", isPrivate: true }));
    repo.items.set("item-archived", makeItem({ id: "item-archived", isArchived: true }));

    const result = await getEmbedWishlistPresentation({ locale: "en", username: OWNER_ID });

    expect(result?.displayItems.map((i) => i.id)).toEqual(["item-public"]);
  });

  it("never exposes isReserved, even on a public wishlist (embeds have no viewer identity)", async () => {
    repo.users.set(OWNER_ID, makeUser(OWNER_ID));
    repo.wishlists.set("wishlist-1", makeWishlist({ isPublic: true }));
    repo.items.set("item-1", makeItem({ isReserved: true, showInWidget: false }));

    const result = await getEmbedWishlistPresentation({ locale: "en", username: OWNER_ID });

    expect(result?.displayItems[0]).not.toHaveProperty("isReserved");
  });
});
