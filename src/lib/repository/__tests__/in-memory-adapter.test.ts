import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryWishlistRepository } from "../in-memory-adapter";
import type { UserProfile, ItemDraft, WishlistData, ItemData } from "../types";

function as<T>(value: unknown): T {
  return value as T;
}

const makeUser = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  emailVerified: null,
  image: null,
  username: "testuser",
  createdAt: new Date("2025-01-01"),
  ...overrides,
});

describe("InMemoryWishlistRepository", () => {
  let repo: InMemoryWishlistRepository;

  beforeEach(() => {
    repo = new InMemoryWishlistRepository();
  });

  describe("user-by-id", () => {
    it("returns null for missing user", async () => {
      const result = await repo.load({ type: "user-by-id", id: "nonexistent" });
      expect(result).toBeNull();
    });

    it("returns user by id", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);
      const result = await repo.load({ type: "user-by-id", id: user.id });
      expect(result).not.toBeNull();
      expect(result!.username).toBe("testuser");
    });
  });

  describe("user-by-username", () => {
    it("returns null for missing username", async () => {
      const result = await repo.load({ type: "user-by-username", username: "nobody" });
      expect(result).toBeNull();
    });

    it("returns user by username", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);
      const result = await repo.load({ type: "user-by-username", username: "testuser" });
      expect(result).not.toBeNull();
      expect(result!.id).toBe("user-1");
    });
  });

  describe("user-by-email", () => {
    it("returns null for missing email", async () => {
      const result = await repo.load({ type: "user-by-email", email: "missing@test.com" });
      expect(result).toBeNull();
    });

    it("returns user by email", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);
      const result = await repo.load({ type: "user-by-email", email: "test@example.com" });
      expect(result).not.toBeNull();
      expect(result!.username).toBe("testuser");
    });
  });

  describe("viewer-page-user", () => {
    it("returns null for missing username", async () => {
      const result = await repo.load({ type: "viewer-page-user", username: "nobody" });
      expect(result).toBeNull();
    });

    it("returns user with categories, followers, following", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);
      repo.categories.set("cat-1", { id: "cat-1", name: "Books", userId: user.id, createdAt: new Date() });
      repo.follows.set("f1:f2", { followerId: "follower-1", followingId: user.id });

      const result = await repo.load({ type: "viewer-page-user", username: "testuser" });
      expect(result).not.toBeNull();
      expect(result!.categories).toHaveLength(1);
      expect(result!.categories[0].name).toBe("Books");
      expect(result!.followers).toHaveLength(1);
      expect(result!.followers[0].followerId).toBe("follower-1");
    });
  });

  describe("create-wishlist", () => {
    it("creates and returns a wishlist", async () => {
      const result = as<WishlistData>(await repo.execute({
        type: "create-wishlist",
        userId: "user-1",
        title: "My Wishlist",
        slug: "my-wishlist",
      }));
      expect(result).not.toBeNull();
      expect(result.title).toBe("My Wishlist");
      expect(result.slug).toBe("my-wishlist");
      expect(result.userId).toBe("user-1");
    });
  });

  describe("owned-wishlist", () => {
    it("returns null when not owned", async () => {
      await repo.execute({ type: "create-wishlist", userId: "user-1", title: "Test", slug: "test" });
      const result = await repo.load({ type: "owned-wishlist", wishlistId: "nonexistent", userId: "user-1" });
      expect(result).toBeNull();
    });

    it("returns owned wishlist info", async () => {
      const w = as<WishlistData>(await repo.execute({ type: "create-wishlist", userId: "user-1", title: "Test", slug: "test" }));
      const result = await repo.load({ type: "owned-wishlist", wishlistId: w.id, userId: "user-1" });
      expect(result).not.toBeNull();
      expect(result!.id).toBe(w.id);
    });

    it("require throws when not found", async () => {
      await expect(
        repo.require({ type: "owned-wishlist", wishlistId: "nonexistent", userId: "user-1" })
      ).rejects.toThrow("Required owned-wishlist not found");
    });
  });

  describe("wishlist-appearance", () => {
    it("returns null when user has no wishlist", async () => {
      const result = await repo.load({ type: "wishlist-appearance", userId: "user-1" });
      expect(result).toBeNull();
    });

    it("returns appearance info", async () => {
      const w = as<WishlistData>(await repo.execute({ type: "create-wishlist", userId: "user-1", title: "Test", slug: "test" }));
      const result = await repo.load({ type: "wishlist-appearance", userId: "user-1" });
      expect(result).not.toBeNull();
      expect(result!.id).toBe(w.id);
      expect(result!.appearance).toEqual({});
    });

    it("require throws when not found", async () => {
      await expect(
        repo.require({ type: "wishlist-appearance", userId: "nobody" })
      ).rejects.toThrow("Required wishlist-appearance not found");
    });
  });

  describe("add-item", () => {
    it("creates an item under a wishlist", async () => {
      await repo.execute({ type: "setup-user-account", userId: "user-1", username: "testuser", title: "Test" });
      const wishlist = [...repo.wishlists.values()].find(w => w.userId === "user-1")!;

      const item = as<ItemData>(await repo.execute({
        type: "add-item",
        userId: "user-1",
        item: { name: "Test Item", currency: "USD", priority: 3, isPrivate: false, wishlistId: wishlist.id },
      }));
      expect(item).not.toBeNull();
      expect(item.name).toBe("Test Item");
      expect(item.wishlistId).toBe(wishlist.id);
    });

    it("creates a category when newCategoryName is provided", async () => {
      await repo.execute({ type: "setup-user-account", userId: "user-1", username: "testuser", title: "Test" });
      const wishlist = [...repo.wishlists.values()].find(w => w.userId === "user-1")!;

      const item = as<ItemData>(await repo.execute({
        type: "add-item",
        userId: "user-1",
        item: { name: "Book", currency: "USD", priority: 1, isPrivate: false, wishlistId: wishlist.id, newCategoryName: "Books" },
      }));
      expect([...repo.categories.values()].length).toBe(1);
      expect([...repo.categories.values()][0].name).toBe("Books");
      expect(item.categoryId).toBe([...repo.categories.values()][0].id);
    });
  });

  describe("toggle-follow", () => {
    it("creates a follow when none exists", async () => {
      const result = as<{ followed: boolean }>(await repo.execute({ type: "toggle-follow", followerId: "user-1", followingId: "user-2" }));
      expect(result.followed).toBe(true);
      expect([...repo.follows.values()]).toHaveLength(1);
    });

    it("removes a follow when one exists", async () => {
      await repo.execute({ type: "toggle-follow", followerId: "user-1", followingId: "user-2" });
      const result = as<{ followed: boolean }>(await repo.execute({ type: "toggle-follow", followerId: "user-1", followingId: "user-2" }));
      expect(result.followed).toBe(false);
      expect([...repo.follows.values()]).toHaveLength(0);
    });
  });

  describe("widget-item-count", () => {
    it("returns 0 when no items are in widget", async () => {
      const count = await repo.load({ type: "widget-item-count", userId: "user-1" });
      expect(count).toBe(0);
    });

    it("counts items with showInWidget=true", async () => {
      await repo.execute({ type: "setup-user-account", userId: "user-1", username: "testuser", title: "Test" });
      const wishlist = [...repo.wishlists.values()].find(w => w.userId === "user-1")!;
      const item = as<ItemData>(await repo.execute({
        type: "add-item", userId: "user-1",
        item: { name: "Item", currency: "USD", priority: 1, isPrivate: false, wishlistId: wishlist.id },
      }));
      await repo.execute({ type: "update-widget-item-visibility", itemId: item.id, showInWidget: true });

      const count = await repo.load({ type: "widget-item-count", userId: "user-1" });
      expect(count).toBe(1);
    });
  });

  describe("dashboard-user", () => {
    it("returns null for missing user", async () => {
      const result = await repo.load({ type: "dashboard-user", userId: "nobody" });
      expect(result).toBeNull();
    });

    it("returns user with wishlist and items", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);
      await repo.execute({ type: "create-wishlist", userId: user.id, title: "Test", slug: "test" });
      const wishlist = [...repo.wishlists.values()].find(w => w.userId === user.id)!;

      const result = await repo.load({ type: "dashboard-user", userId: user.id });
      expect(result).not.toBeNull();
      expect(result!.wishlist).not.toBeNull();
      expect(result!.wishlist!.id).toBe(wishlist.id);
    });
  });

  describe("update-user-profile", () => {
    it("updates name and username", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);

      await repo.execute({ type: "update-user-profile", userId: user.id, name: "Updated", username: "updated" });
      const updated = repo.users.get(user.id)!;
      expect(updated.name).toBe("Updated");
      expect(updated.username).toBe("updated");
    });

    it("updates wishlist appearance when provided", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);
      await repo.execute({ type: "create-wishlist", userId: user.id, title: "Test", slug: "test" });

      await repo.execute({ type: "update-user-profile", userId: user.id, name: "Test", appearance: { primaryColor: "#ff0000" } });
      const wishlist = [...repo.wishlists.values()].find(w => w.userId === user.id)!;
      expect(wishlist.appearance.primaryColor).toBe("#ff0000");
    });
  });

  describe("update-widget-settings", () => {
    it("updates wishlist appearance", async () => {
      const w: any = await repo.execute({ type: "create-wishlist", userId: "user-1", title: "Test", slug: "test" });
      await repo.execute({ type: "update-widget-settings", wishlistId: w.id, appearance: { widgetLayout: "list" } });
      const updated = repo.wishlists.get(w.id)!;
      expect(updated.appearance.widgetLayout).toBe("list");
    });
  });

  describe("setup-user-account", () => {
    it("sets username and creates default wishlist", async () => {
      const user = makeUser({ username: null });
      repo.users.set(user.id, user);

      await repo.execute({ type: "setup-user-account", userId: user.id, username: "testuser", title: "Test" });
      expect(repo.users.get(user.id)!.username).toBe("testuser");
      expect([...repo.wishlists.values()].length).toBe(1);
      expect([...repo.wishlists.values()][0].title).toBe("Test");
    });
  });

  describe("wishlist-presentation", () => {
    it("returns null when user has no wishlist", async () => {
      const result = await repo.load({ type: "wishlist-presentation", userId: "user-1", canViewPrivate: false });
      expect(result).toBeNull();
    });

    it("returns wishlist with filtered items", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);
      const w: any = await repo.execute({ type: "create-wishlist", userId: user.id, title: "Test", slug: "test" });
      await repo.execute({
        type: "add-item", userId: user.id,
        item: { name: "Public", currency: "USD", priority: 1, isPrivate: false, wishlistId: w.id },
      });
      await repo.execute({
        type: "add-item", userId: user.id,
        item: { name: "Private", currency: "USD", priority: 2, isPrivate: true, wishlistId: w.id },
      });

      const result = await repo.load({ type: "wishlist-presentation", userId: user.id, canViewPrivate: false });
      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].name).toBe("Public");
    });

    it("returns private items when canViewPrivate is true", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);
      const w: any = await repo.execute({ type: "create-wishlist", userId: user.id, title: "Test", slug: "test" });
      await repo.execute({
        type: "add-item", userId: user.id,
        item: { name: "Secret", currency: "USD", priority: 1, isPrivate: true, wishlistId: w.id },
      });

      const result = await repo.load({ type: "wishlist-presentation", userId: user.id, canViewPrivate: true });
      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].name).toBe("Secret");
    });
  });

  describe("embed-presentation", () => {
    it("returns null for missing user", async () => {
      const result = await repo.load({ type: "embed-presentation", username: "nobody" });
      expect(result).toBeNull();
    });

    it("returns user with wishlist and public items", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);
      const w: any = await repo.execute({ type: "create-wishlist", userId: user.id, title: "Test", slug: "test" });
      await repo.execute({
        type: "add-item", userId: user.id,
        item: { name: "Public", currency: "USD", priority: 1, isPrivate: false, wishlistId: w.id },
      });

      const result = await repo.load({ type: "embed-presentation", username: "testuser" });
      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(1);
    });
  });

  describe("require", () => {
    it("throws EntityNotFoundError for owned-wishlist", async () => {
      await expect(
        repo.require({ type: "owned-wishlist", wishlistId: "x", userId: "y" })
      ).rejects.toThrow("Required owned-wishlist not found");
    });

    it("throws with custom message", async () => {
      await expect(
        repo.require({ type: "owned-item", itemId: "x", userId: "y", message: "Custom error" })
      ).rejects.toThrow("Custom error");
    });
  });

  describe("follow-status", () => {
    it("returns null when no follow exists", async () => {
      const result = await repo.load({ type: "follow-status", followerId: "a", followingId: "b" });
      expect(result).toBeNull();
    });

    it("returns follow relation", async () => {
      await repo.execute({ type: "toggle-follow", followerId: "a", followingId: "b" });
      const result = await repo.load({ type: "follow-status", followerId: "a", followingId: "b" });
      expect(result).not.toBeNull();
      expect(result!.followerId).toBe("a");
      expect(result!.followingId).toBe("b");
    });
  });

  describe("owned-item", () => {
    it("returns null when item does not belong to user", async () => {
      const result = await repo.load({ type: "owned-item", itemId: "x", userId: "y" });
      expect(result).toBeNull();
    });

    it("returns owned item info", async () => {
      const user = makeUser();
      repo.users.set(user.id, user);
      const w = as<WishlistData>(await repo.execute({ type: "create-wishlist", userId: user.id, title: "Test", slug: "test" }));
      const item = as<ItemData>(await repo.execute({
        type: "add-item", userId: user.id,
        item: { name: "Item", currency: "USD", priority: 1, isPrivate: false, wishlistId: w.id },
      }));

      const result = await repo.load({ type: "owned-item", itemId: item.id, userId: user.id });
      expect(result).not.toBeNull();
      expect(result!.id).toBe(item.id);
    });

    it("require throws when not owned", async () => {
      await expect(
        repo.require({ type: "owned-item", itemId: "x", userId: "y" })
      ).rejects.toThrow("Required owned-item not found");
    });
  });
});
