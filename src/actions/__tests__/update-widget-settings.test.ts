import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateWidgetSettings } from "../update-widget-settings";
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

function makeWishlist(id: string, userId: string, appearance: Record<string, unknown> = {}): WishlistData {
  return {
    id,
    title: "Test Wishlist",
    description: null,
    slug: id,
    isPublic: true,
    shareToken: null,
    appearance,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("updateWidgetSettings", () => {
  let repo: InMemoryWishlistRepository;

  beforeEach(() => {
    repo = new InMemoryWishlistRepository();
    setTestRepository(repo);
    vi.clearAllMocks();
  });

  it("rejects unauthenticated callers and performs no write", async () => {
    mockAuth.mockResolvedValue(null);
    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1"));

    const result = await updateWidgetSettings({ layout: "list" });

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(repo.wishlists.get("wl-1")?.appearance).toEqual({});
  });

  it("rejects when the caller has no owned wishlist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const result = await updateWidgetSettings({ layout: "list" });

    expect(result).toEqual({ success: false, error: "Wishlist not found" });
  });

  it("merges layout/itemSize into existing appearance JSON", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1", { colorPreset: "rose" }));

    const result = await updateWidgetSettings({ layout: "list", itemSize: 40 });

    expect(result).toEqual({ success: true });
    expect(repo.wishlists.get("wl-1")?.appearance).toEqual({
      colorPreset: "rose",
      widgetLayout: "list",
      widgetItemSize: 70,
    });
  });
});
