import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { getDashboardSettingsIntake } from "../dashboard-settings-intake";
import { auth } from "@/auth";
import { setTestRepository } from "../repository";
import { InMemoryWishlistRepository } from "../repository/in-memory-adapter";
import type { ItemData, UserProfile, WishlistData } from "../repository/types";

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

let repo: InMemoryWishlistRepository;

beforeEach(() => {
  repo = new InMemoryWishlistRepository();
  setTestRepository(repo);
  vi.clearAllMocks();
});

describe("getDashboardSettingsIntake", () => {
  it("returns null for an unauthenticated caller", async () => {
    mockAuth.mockResolvedValue(null);

    expect(await getDashboardSettingsIntake()).toBeNull();
  });

  it("excludes archived items (regression: archived items were leaking into the widget picker)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    repo.users.set("owner-1", makeUser("owner-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "owner-1"));
    repo.items.set("item-live", makeItem("item-live", "wl-1", { isArchived: false }));
    repo.items.set("item-archived", makeItem("item-archived", "wl-1", { isArchived: true }));

    const result = await getDashboardSettingsIntake();

    expect(result?.wishlist?.items.map((i) => i.id)).toEqual(["item-live"]);
  });

  it("still includes the owner's private items (this is the owner's own settings view)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    repo.users.set("owner-1", makeUser("owner-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "owner-1"));
    repo.items.set("item-private", makeItem("item-private", "wl-1", { isPrivate: true }));

    const result = await getDashboardSettingsIntake();

    expect(result?.wishlist?.items.map((i) => i.id)).toEqual(["item-private"]);
  });

  it("never exposes isReserved on any item (surprise preservation)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "owner-1" } });
    repo.users.set("owner-1", makeUser("owner-1"));
    repo.wishlists.set("wl-1", makeWishlist("wl-1", "owner-1"));
    repo.items.set("item-1", makeItem("item-1", "wl-1", { isReserved: true }));

    const result = await getDashboardSettingsIntake();

    expect(result?.wishlist?.items[0]).not.toHaveProperty("isReserved");
  });
});
