import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateWidgetItems } from "../update-widget-items";
import { auth } from "@/auth";
import { setTestRepository, type IWishlistRepository } from "@/lib/repository";
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
    name: "Item",
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

describe("updateWidgetItems", () => {
  let repo: InMemoryWishlistRepository;

  beforeEach(() => {
    repo = new InMemoryWishlistRepository();
    setTestRepository(repo);
    vi.clearAllMocks();

    repo.users.set("user-1", makeUser("user-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1"));
  });

  it("rejects unauthenticated callers and performs no write", async () => {
    mockAuth.mockResolvedValue(null);
    repo.items.set("item-1", makeItem("item-1", "wl-1"));

    const result = await updateWidgetItems("item-1", true);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(repo.items.get("item-1")?.showInWidget).toBe(false);
  });

  it("rejects when the caller does not own the item", async () => {
    mockAuth.mockResolvedValue({ user: { id: "stranger" } });
    repo.items.set("item-1", makeItem("item-1", "wl-1"));

    const result = await updateWidgetItems("item-1", true);

    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("enforces the 5-item cap when enabling", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    for (let i = 0; i < 5; i++) {
      repo.items.set(`existing-${i}`, makeItem(`existing-${i}`, "wl-1", { showInWidget: true }));
    }
    repo.items.set("item-1", makeItem("item-1", "wl-1"));

    const result = await updateWidgetItems("item-1", true);

    expect(result).toEqual({
      success: false,
      error: "Maximum 5 items can be shown in widget",
    });
    expect(repo.items.get("item-1")?.showInWidget).toBe(false);
  });

  it("allows enabling when under the cap", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    repo.items.set("item-1", makeItem("item-1", "wl-1"));

    const result = await updateWidgetItems("item-1", true);

    expect(result).toEqual({ success: true });
    expect(repo.items.get("item-1")?.showInWidget).toBe(true);
  });

  it("does not count existing items when disabling", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    for (let i = 0; i < 5; i++) {
      repo.items.set(`existing-${i}`, makeItem(`existing-${i}`, "wl-1", { showInWidget: true }));
    }
    repo.items.set("item-1", makeItem("item-1", "wl-1", { showInWidget: true }));

    const result = await updateWidgetItems("item-1", false);

    expect(result).toEqual({ success: true });
    expect(repo.items.get("item-1")?.showInWidget).toBe(false);
  });

  it("returns a retry-friendly error on a serialization conflict (only Prisma's Serializable transaction can produce this)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    repo.items.set("item-1", makeItem("item-1", "wl-1"));

    const conflictRepo: IWishlistRepository = {
      load: (spec) => repo.load(spec as never),
      require: (spec) => repo.require(spec as never),
      execute: (async () => ({ success: false, error: "conflict" })) as IWishlistRepository["execute"],
    };
    setTestRepository(conflictRepo);

    const result = await updateWidgetItems("item-1", true);

    expect(result).toEqual({ success: false, error: "Please try again" });
  });
});
