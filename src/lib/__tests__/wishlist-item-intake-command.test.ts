import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    item: { create: vi.fn(), update: vi.fn() },
    category: { create: vi.fn() },
  },
}));

vi.mock("../wishlist-command-context", () => ({
  requireOwnedWishlistById: vi.fn(),
  requireOwnedWishlistItem: vi.fn(),
}));

import {
  createWishlistItemFromIntake,
  updateWishlistItemFromIntake,
} from "../wishlist-item-intake-command";
import { prisma } from "../prisma";
import {
  requireOwnedWishlistById,
  requireOwnedWishlistItem,
} from "../wishlist-command-context";

const mockItemUpdate = prisma.item.update as unknown as Mock;
const mockItemCreate = prisma.item.create as unknown as Mock;
const mockCategoryCreate = prisma.category.create as unknown as Mock;
const mockRequireOwnedWishlist = requireOwnedWishlistById as unknown as Mock;
const mockRequireOwnedItem = requireOwnedWishlistItem as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireOwnedWishlist.mockResolvedValue({ id: "wl-1", userId: "user-1" });
  mockRequireOwnedItem.mockResolvedValue({ id: "item-1", wishlistId: "wl-1" });
  mockItemUpdate.mockImplementation(async ({ data }) => ({ id: "item-1", ...data }));
  mockItemCreate.mockImplementation(async ({ data }) => ({ id: "item-new", ...data }));
});

describe("updateWishlistItemFromIntake", () => {
  it("checks ownership of the item being edited, not just the wishlist", async () => {
    await updateWishlistItemFromIntake(
      "item-1",
      { name: "Keyboard" },
      "user-1",
    );

    expect(mockRequireOwnedItem).toHaveBeenCalledWith("item-1", "user-1");
  });

  it("normalizes name/price/priority the same way as create", async () => {
    await updateWishlistItemFromIntake(
      "item-1",
      { name: "  Keyboard  ", price: 42, priority: 9, currency: " usd " },
      "user-1",
    );

    expect(mockItemUpdate).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: expect.objectContaining({
        name: "Keyboard",
        price: 42,
        priority: 5,
        currency: "USD",
      }),
    });
  });

  it("clears url, imageUrl, price, and category when the edit form submits them empty", async () => {
    await updateWishlistItemFromIntake(
      "item-1",
      { name: "Keyboard", url: "", imageUrl: "", price: undefined, categoryId: "" },
      "user-1",
    );

    expect(mockItemUpdate).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: expect.objectContaining({
        url: null,
        imageUrl: null,
        price: null,
        categoryId: null,
      }),
    });
  });

  it("creates and assigns a new category when requested", async () => {
    mockCategoryCreate.mockResolvedValue({ id: "cat-1", name: "Gadgets" });

    await updateWishlistItemFromIntake(
      "item-1",
      { name: "Keyboard", categoryId: "new", newCategoryName: "Gadgets" },
      "user-1",
    );

    expect(mockCategoryCreate).toHaveBeenCalledWith({
      data: { name: "Gadgets", userId: "user-1" },
    });
    expect(mockItemUpdate).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: expect.objectContaining({ categoryId: "cat-1" }),
    });
  });

  it("rejects a blank name, matching create's validation", async () => {
    await expect(
      updateWishlistItemFromIntake("item-1", { name: "  " }, "user-1"),
    ).rejects.toThrow("Item name is required");
  });
});

describe("createWishlistItemFromIntake (unchanged create path)", () => {
  it("leaves an unset category as undefined rather than clearing", async () => {
    await createWishlistItemFromIntake(
      { wishlistId: "wl-1", name: "Keyboard" },
      "user-1",
    );

    expect(mockItemCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ categoryId: undefined }),
    });
  });
});
