import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/wishlist-command-context", () => ({
  requireAuthenticatedUserId: vi.fn(),
  requireOwnedWishlistAppearance: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wishlist: { update: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateWidgetSettings } from "../update-widget-settings";
import {
  requireAuthenticatedUserId,
  requireOwnedWishlistAppearance,
} from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";

const mockRequireAuth = requireAuthenticatedUserId as unknown as Mock;
const mockRequireOwnedAppearance =
  requireOwnedWishlistAppearance as unknown as Mock;
const mockWishlistUpdate = prisma.wishlist.update as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateWidgetSettings", () => {
  it("rejects unauthenticated callers and performs no write", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    await expect(updateWidgetSettings({ layout: "list" })).rejects.toThrow();
    expect(mockWishlistUpdate).not.toHaveBeenCalled();
  });

  it("rejects when the caller has no owned wishlist", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwnedAppearance.mockRejectedValue(
      new Error("Wishlist not found"),
    );

    await expect(updateWidgetSettings({ layout: "list" })).rejects.toThrow();
    expect(mockWishlistUpdate).not.toHaveBeenCalled();
  });

  it("merges layout/itemSize into existing appearance JSON", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockRequireOwnedAppearance.mockResolvedValue({
      id: "wl-1",
      appearance: { colorPreset: "rose" },
    });
    mockWishlistUpdate.mockResolvedValue({});

    const result = await updateWidgetSettings({
      layout: "list",
      itemSize: 40,
    });

    expect(mockWishlistUpdate).toHaveBeenCalledWith({
      where: { id: "wl-1" },
      data: {
        appearance: {
          colorPreset: "rose",
          widgetLayout: "list",
          widgetItemSize: 70,
        },
      },
    });
    expect(result).toEqual({ success: true });
  });
});
