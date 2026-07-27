import { InMemoryWishlistRepository } from "../in-memory-adapter";
import { runRepositoryConformanceSuite, type ConformanceHarness } from "./conformance";
import type { ItemData, UserProfile, WishlistData } from "../types";

let userCounter = 0;
let wishlistCounter = 0;
let itemCounter = 0;

function makeHarness(): ConformanceHarness {
  const repo = new InMemoryWishlistRepository();

  return {
    repo,
    async reset() {
      repo.users.clear();
      repo.wishlists.clear();
      repo.items.clear();
      repo.categories.clear();
      repo.follows.clear();
    },
    async createUser(overrides = {}) {
      userCounter += 1;
      const id = `user-${userCounter}`;
      const username = overrides.username ?? `user${userCounter}`;
      const user: UserProfile = {
        id,
        name: "Test User",
        email: overrides.email ?? `${username}@example.com`,
        emailVerified: null,
        image: null,
        username,
        createdAt: new Date(),
      };
      repo.users.set(id, user);
      return { id, username: username };
    },
    async createWishlist(userId, overrides = {}) {
      wishlistCounter += 1;
      const id = `wishlist-${wishlistCounter}`;
      const wishlist: WishlistData = {
        id,
        title: "Test Wishlist",
        description: null,
        slug: `wishlist-${wishlistCounter}`,
        isPublic: overrides.isPublic ?? true,
        shareToken: overrides.shareToken ?? null,
        appearance: {},
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repo.wishlists.set(id, wishlist);
      return { id };
    },
    async createItem(wishlistId, overrides = {}) {
      itemCounter += 1;
      const id = `item-${itemCounter}`;
      const item: ItemData = {
        id,
        name: overrides.name ?? `Item ${itemCounter}`,
        url: null,
        imageUrl: null,
        price: overrides.price ?? null,
        currency: "UAH",
        priority: 3,
        isReserved: overrides.isReserved ?? false,
        isPrivate: overrides.isPrivate ?? false,
        isArchived: overrides.isArchived ?? false,
        showInWidget: overrides.showInWidget ?? false,
        wishlistId,
        categoryId: null,
        createdAt: new Date(),
      };
      repo.items.set(id, item);
      return { id };
    },
    async createFollow(followerId, followingId) {
      repo.follows.set(`${followerId}:${followingId}`, { followerId, followingId });
    },
  };
}

runRepositoryConformanceSuite("InMemoryWishlistRepository", makeHarness);
