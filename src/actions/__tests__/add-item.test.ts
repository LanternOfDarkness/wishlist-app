import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/wishlist-command-context", () => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/lib/wishlist-item-intake-command", () => ({
  createWishlistItemFromIntake: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { addItem } from "../add-item";
import { getAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { createWishlistItemFromIntake } from "@/lib/wishlist-item-intake-command";

const mockGetAuth = getAuthenticatedUserId as unknown as Mock;
const mockCreateItem = createWishlistItemFromIntake as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("addItem", () => {
  it("rejects unauthenticated callers and performs no write", async () => {
    mockGetAuth.mockResolvedValue(null);

    const result = await addItem({ name: "Book", wishlistId: "wl-1" });

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it("surfaces a known validation error verbatim", async () => {
    mockGetAuth.mockResolvedValue("user-1");
    mockCreateItem.mockRejectedValue(new Error("Item name is required"));

    const result = await addItem({ name: "", wishlistId: "wl-1" });

    expect(result).toEqual({
      success: false,
      error: "Item name is required",
    });
  });

  it("surfaces a known ownership-denial error verbatim", async () => {
    mockGetAuth.mockResolvedValue("user-1");
    mockCreateItem.mockRejectedValue(
      new Error("Wishlist not found or access denied"),
    );

    const result = await addItem({ name: "Book", wishlistId: "not-mine" });

    expect(result).toEqual({
      success: false,
      error: "Wishlist not found or access denied",
    });
  });

  it("hides unexpected/infra errors behind a generic message", async () => {
    mockGetAuth.mockResolvedValue("user-1");
    mockCreateItem.mockRejectedValue(
      new Error("connect ECONNREFUSED 127.0.0.1:5432"),
    );

    const result = await addItem({ name: "Book", wishlistId: "wl-1" });

    expect(result).toEqual({ success: false, error: "Failed to add item" });
  });

  it("returns the created item on success", async () => {
    mockGetAuth.mockResolvedValue("user-1");
    mockCreateItem.mockResolvedValue({ id: "item-1", name: "Book" });

    const result = await addItem({ name: "Book", wishlistId: "wl-1" });

    expect(result).toEqual({
      success: true,
      item: { id: "item-1", name: "Book" },
    });
  });
});
