import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/wishlist-command-context", () => ({
  requireAuthenticatedUserId: vi.fn(),
  requireOwnedWishlistItem: vi.fn(),
  countSelectedWidgetItems: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    item: { update: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateWidgetItems } from "../update-widget-items";
import {
  requireAuthenticatedUserId,
  requireOwnedWishlistItem,
  countSelectedWidgetItems,
} from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const mockRequireAuth = requireAuthenticatedUserId as unknown as Mock;
const mockRequireOwned = requireOwnedWishlistItem as unknown as Mock;
const mockCount = countSelectedWidgetItems as unknown as Mock;
const mockTransaction = prisma.$transaction as unknown as Mock;
const mockItemUpdate = prisma.item.update as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

function stubTransaction() {
  mockTransaction.mockImplementation(async (callback, options) => {
    expect(options).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    return callback({ item: { update: mockItemUpdate } });
  });
}

describe("updateWidgetItems", () => {
  it("rejects unauthenticated callers and performs no write", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    await expect(updateWidgetItems("item-1", true)).rejects.toThrow();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects when the caller does not own the item", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockRejectedValue(new Error("Item not found"));

    await expect(updateWidgetItems("item-1", true)).rejects.toThrow();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("enforces the 5-item cap when enabling", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockResolvedValue({ id: "item-1" });
    mockCount.mockResolvedValue(5);
    stubTransaction();

    const result = await updateWidgetItems("item-1", true);

    expect(result).toEqual({ error: "Maximum 5 items can be shown in widget" });
    expect(mockItemUpdate).not.toHaveBeenCalled();
  });

  it("allows enabling when under the cap", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockResolvedValue({ id: "item-1" });
    mockCount.mockResolvedValue(4);
    mockItemUpdate.mockResolvedValue({ id: "item-1", showInWidget: true });
    stubTransaction();

    const result = await updateWidgetItems("item-1", true);

    expect(result).toEqual({ success: true });
    expect(mockItemUpdate).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { showInWidget: true },
    });
  });

  it("does not count existing items when disabling", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockResolvedValue({ id: "item-1" });
    mockItemUpdate.mockResolvedValue({ id: "item-1", showInWidget: false });
    stubTransaction();

    await updateWidgetItems("item-1", false);

    expect(mockCount).not.toHaveBeenCalled();
    expect(mockItemUpdate).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { showInWidget: false },
    });
  });

  it("returns a retry-friendly error on a serialization conflict instead of exceeding the cap", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockResolvedValue({ id: "item-1" });

    const conflictError = new Prisma.PrismaClientKnownRequestError(
      "Transaction failed due to a write conflict or a deadlock.",
      { code: "P2034", clientVersion: "test" },
    );
    mockTransaction.mockRejectedValue(conflictError);

    const result = await updateWidgetItems("item-1", true);

    expect(result).toEqual({ error: "Please try again" });
  });

  it("rethrows unexpected transaction errors", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwned.mockResolvedValue({ id: "item-1" });
    mockTransaction.mockRejectedValue(new Error("DB is down"));

    await expect(updateWidgetItems("item-1", true)).rejects.toThrow(
      "DB is down",
    );
  });
});
