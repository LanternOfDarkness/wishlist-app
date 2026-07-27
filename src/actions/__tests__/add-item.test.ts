import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { addItem } from "../add-item";
import { auth } from "@/auth";
import { setTestRepository } from "@/lib/repository";
import { InMemoryWishlistRepository } from "@/lib/repository/in-memory-adapter";
import type { UserProfile, WishlistData } from "@/lib/repository/types";

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

describe("addItem", () => {
  let repo: InMemoryWishlistRepository;

  beforeEach(() => {
    repo = new InMemoryWishlistRepository();
    setTestRepository(repo);
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects unauthenticated callers and performs no write", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await addItem({ name: "Book", wishlistId: "wl-1" });

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(repo.items.size).toBe(0);
  });

  it("surfaces a validation error verbatim", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1"));

    const result = await addItem({ name: "", wishlistId: "wl-1" });

    expect(result).toEqual({ success: false, error: "Item name is required" });
    expect(repo.items.size).toBe(0);
  });

  it("surfaces an ownership-denial error verbatim", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-other", makeWishlist("wl-other", "someone-else"));

    const result = await addItem({ name: "Book", wishlistId: "wl-other" });

    expect(result).toEqual({
      success: false,
      error: "Wishlist not found or access denied",
    });
    expect(repo.items.size).toBe(0);
  });

  it("returns the created item on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1"));

    const result = await addItem({ name: "Book", wishlistId: "wl-1" });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({
      name: "Book",
      wishlistId: "wl-1",
    });
    expect(repo.items.size).toBe(1);
  });
});
