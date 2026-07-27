import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { regenerateShareToken, revokeShareToken } from "../wishlist-visibility";
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

function makeWishlist(id: string, userId: string, shareToken: string | null = null): WishlistData {
  return {
    id,
    title: "Test Wishlist",
    description: null,
    slug: id,
    isPublic: false,
    shareToken,
    appearance: {},
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("regenerateShareToken", () => {
  let repo: InMemoryWishlistRepository;

  beforeEach(() => {
    repo = new InMemoryWishlistRepository();
    setTestRepository(repo);
    vi.clearAllMocks();
  });

  it("rejects unauthenticated callers and performs no write", async () => {
    mockAuth.mockResolvedValue(null);
    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1", "old-token"));

    const result = await regenerateShareToken();

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(repo.wishlists.get("wl-1")?.shareToken).toBe("old-token");
  });

  it("generates a fresh, sufficiently random token for the caller's wishlist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1", "old-token"));

    const first = await regenerateShareToken();
    const second = await regenerateShareToken();

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (first.success && second.success && first.data && second.data) {
      expect(first.data.shareToken).not.toBe("old-token");
      expect(first.data.shareToken).not.toBe(second.data.shareToken);
    }
    expect(repo.wishlists.get("wl-1")?.shareToken).toBe(second.success ? second.data?.shareToken : undefined);
  });
});

describe("revokeShareToken", () => {
  let repo: InMemoryWishlistRepository;

  beforeEach(() => {
    repo = new InMemoryWishlistRepository();
    setTestRepository(repo);
    vi.clearAllMocks();
  });

  it("rejects unauthenticated callers and performs no write", async () => {
    mockAuth.mockResolvedValue(null);
    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1", "old-token"));

    const result = await revokeShareToken();

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(repo.wishlists.get("wl-1")?.shareToken).toBe("old-token");
  });

  it("clears the share token for the caller's wishlist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1", "old-token"));

    const result = await revokeShareToken();

    expect(result).toEqual({ success: true });
    expect(repo.wishlists.get("wl-1")?.shareToken).toBeNull();
  });
});
