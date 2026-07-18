import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/wishlist-command-context", () => ({
  requireAuthenticatedUserId: vi.fn(),
  requireOwnedWishlistItem: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/wishlist-item-intake-command", () => ({
  updateWishlistItemFromIntake: vi.fn(),
}));

import { updateItem } from "../update-item";
import { deleteItem } from "../delete-item";
import { setItemArchived } from "../archive-item";
import {
  requireAuthenticatedUserId,
  requireOwnedWishlistItem,
} from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";
import { updateWishlistItemFromIntake } from "@/lib/wishlist-item-intake-command";

const mockRequireAuth = requireAuthenticatedUserId as unknown as Mock;
const mockRequireOwned = requireOwnedWishlistItem as unknown as Mock;
const mockUpdateFromIntake = updateWishlistItemFromIntake as unknown as Mock;
const mockItemDelete = prisma.item.delete as unknown as Mock;
const mockItemUpdate = prisma.item.update as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("updateItem", () => {
  it("rejects unauthenticated callers and performs no write", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const result = await updateItem("item-1", { name: "New name" });

    expect(result).toEqual({ success: false, error: "Failed to update item" });
    expect(mockUpdateFromIntake).not.toHaveBeenCalled();
  });

  it("rejects when the caller does not own the item", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockUpdateFromIntake.mockRejectedValue(new Error("Item not found"));

    const result = await updateItem("item-1", { name: "New name" });

    expect(result).toEqual({ success: false, error: "Failed to update item" });
  });

  it("updates the item when the caller is authorized", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockUpdateFromIntake.mockResolvedValue({ id: "item-1", name: "New name" });

    const result = await updateItem("item-1", { name: "New name" });

    expect(result).toEqual({
      success: true,
      item: { id: "item-1", name: "New name" },
    });
    expect(mockUpdateFromIntake).toHaveBeenCalledWith(
      "item-1",
      { name: "New name" },
      "user-1",
    );
  });
});

describe("deleteItem", () => {
  it("rejects unauthenticated callers and performs no delete", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const result = await deleteItem("item-1");

    expect(result).toEqual({ success: false, error: "Failed to delete item" });
    expect(mockItemDelete).not.toHaveBeenCalled();
  });

  it("rejects when the caller does not own the item", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockRejectedValue(new Error("Item not found"));

    const result = await deleteItem("item-1");

    expect(result).toEqual({ success: false, error: "Failed to delete item" });
    expect(mockItemDelete).not.toHaveBeenCalled();
  });

  it("deletes the item when the caller is authorized", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockResolvedValue({ id: "item-1", wishlistId: "wl-1" });
    mockItemDelete.mockResolvedValue({ id: "item-1" });

    const result = await deleteItem("item-1");

    expect(result).toEqual({ success: true });
    expect(mockItemDelete).toHaveBeenCalledWith({ where: { id: "item-1" } });
  });
});

describe("setItemArchived", () => {
  it("rejects unauthenticated callers and performs no write", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const result = await setItemArchived("item-1", true);

    expect(result).toEqual({ success: false, error: "Failed to update item" });
    expect(mockItemUpdate).not.toHaveBeenCalled();
  });

  it("rejects when the caller does not own the item", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockRejectedValue(new Error("Item not found"));

    const result = await setItemArchived("item-1", true);

    expect(result).toEqual({ success: false, error: "Failed to update item" });
    expect(mockItemUpdate).not.toHaveBeenCalled();
  });

  it("archives the item when the caller is authorized", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockResolvedValue({ id: "item-1", wishlistId: "wl-1" });
    mockItemUpdate.mockResolvedValue({ id: "item-1", isArchived: true });

    const result = await setItemArchived("item-1", true);

    expect(result).toEqual({
      success: true,
      item: { id: "item-1", isArchived: true },
    });
    expect(mockItemUpdate).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { isArchived: true },
    });
  });

  it("unarchives the item when passed false", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockResolvedValue({ id: "item-1", wishlistId: "wl-1" });
    mockItemUpdate.mockResolvedValue({ id: "item-1", isArchived: false });

    await setItemArchived("item-1", false);

    expect(mockItemUpdate).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { isArchived: false },
    });
  });
});
