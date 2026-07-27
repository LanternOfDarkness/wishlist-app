import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateItem } from "../update-item";
import { deleteItem } from "../delete-item";
import { setItemArchived } from "../archive-item";
import { auth } from "@/auth";
import { setTestRepository } from "@/lib/repository";
import { InMemoryWishlistRepository } from "@/lib/repository/in-memory-adapter";
import type { ItemData, UserProfile, WishlistData } from "@/lib/repository/types";

const mockAuth = auth as unknown as Mock;

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

function makeWishlist(id: string, userId: string): WishlistData {
  return {
    id,
    title: "Test Wishlist",
    description: null,
    slug: id,
    isPublic: true,
    shareToken: null,
    appearance: {},
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeItem(id: string, wishlistId: string, overrides: Partial<ItemData> = {}): ItemData {
  return {
    id,
    name: "Old name",
    url: null,
    imageUrl: null,
    price: null,
    currency: "UAH",
    priority: 3,
    isReserved: false,
    isPrivate: false,
    isArchived: false,
    showInWidget: false,
    wishlistId,
    categoryId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("item mutations", () => {
  let repo: InMemoryWishlistRepository;

  beforeEach(() => {
    repo = new InMemoryWishlistRepository();
    setTestRepository(repo);
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1"));
    repo.items.set("item-1", makeItem("item-1", "wl-1"));
  });

  describe("updateItem", () => {
    it("rejects unauthenticated callers and performs no write", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await updateItem("item-1", { name: "New name" } as never);

      expect(result).toEqual({ success: false, error: "Unauthorized" });
      expect(repo.items.get("item-1")?.name).toBe("Old name");
    });

    it("rejects when the caller does not own the item", async () => {
      mockAuth.mockResolvedValue({ user: { id: "stranger" } });

      const result = await updateItem("item-1", { name: "New name" } as never);

      expect(result).toEqual({ success: false, error: "Item not found" });
      expect(repo.items.get("item-1")?.name).toBe("Old name");
    });

    it("updates the item when the caller is authorized", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });

      const result = await updateItem("item-1", {
        name: "New name",
        currency: "USD",
        priority: 2,
        isPrivate: true,
      });

      expect(result.success).toBe(true);
      expect(repo.items.get("item-1")?.name).toBe("New name");
    });
  });

  describe("deleteItem", () => {
    it("rejects unauthenticated callers and performs no delete", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await deleteItem("item-1");

      expect(result).toEqual({ success: false, error: "Unauthorized" });
      expect(repo.items.has("item-1")).toBe(true);
    });

    it("rejects when the caller does not own the item", async () => {
      mockAuth.mockResolvedValue({ user: { id: "stranger" } });

      const result = await deleteItem("item-1");

      expect(result).toEqual({ success: false, error: "Item not found" });
      expect(repo.items.has("item-1")).toBe(true);
    });

    it("deletes the item when the caller is authorized", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });

      const result = await deleteItem("item-1");

      expect(result).toEqual({ success: true });
      expect(repo.items.has("item-1")).toBe(false);
    });
  });

  describe("setItemArchived", () => {
    it("rejects unauthenticated callers and performs no write", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await setItemArchived("item-1", true);

      expect(result).toEqual({ success: false, error: "Unauthorized" });
      expect(repo.items.get("item-1")?.isArchived).toBe(false);
    });

    it("rejects when the caller does not own the item", async () => {
      mockAuth.mockResolvedValue({ user: { id: "stranger" } });

      const result = await setItemArchived("item-1", true);

      expect(result).toEqual({ success: false, error: "Item not found" });
      expect(repo.items.get("item-1")?.isArchived).toBe(false);
    });

    it("archives the item when the caller is authorized", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });

      const result = await setItemArchived("item-1", true);

      expect(result.success).toBe(true);
      expect(repo.items.get("item-1")?.isArchived).toBe(true);
    });

    it("unarchives the item when passed false", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      repo.items.set("item-1", makeItem("item-1", "wl-1", { isArchived: true }));

      await setItemArchived("item-1", false);

      expect(repo.items.get("item-1")?.isArchived).toBe(false);
    });
  });
});
