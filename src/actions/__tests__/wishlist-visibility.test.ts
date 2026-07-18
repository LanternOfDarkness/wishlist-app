import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/wishlist-command-context", () => ({
  requireAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wishlist: { update: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { regenerateShareToken, revokeShareToken } from "../wishlist-visibility";
import { requireAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";

const mockRequireAuth = requireAuthenticatedUserId as unknown as Mock;
const mockWishlistUpdate = prisma.wishlist.update as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("regenerateShareToken", () => {
  it("rejects unauthenticated callers and performs no write", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const result = await regenerateShareToken();

    expect(result).toEqual({
      success: false,
      error: "Failed to update share link",
    });
    expect(mockWishlistUpdate).not.toHaveBeenCalled();
  });

  it("generates a fresh, sufficiently random token for the caller's wishlist", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockWishlistUpdate.mockImplementation(async ({ data }) => ({
      id: "wl-1",
      ...data,
    }));

    const first = await regenerateShareToken();
    const second = await regenerateShareToken();

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (first.success && second.success) {
      expect(first.shareToken).toMatch(/^[0-9a-f]{32}$/);
      expect(first.shareToken).not.toBe(second.shareToken);
    }
    expect(mockWishlistUpdate).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { shareToken: expect.any(String) },
    });
  });

  it("returns a generic error if the write fails", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockWishlistUpdate.mockRejectedValue(new Error("DB down"));

    const result = await regenerateShareToken();

    expect(result).toEqual({
      success: false,
      error: "Failed to update share link",
    });
  });
});

describe("revokeShareToken", () => {
  it("rejects unauthenticated callers and performs no write", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const result = await revokeShareToken();

    expect(result).toEqual({
      success: false,
      error: "Failed to revoke share link",
    });
    expect(mockWishlistUpdate).not.toHaveBeenCalled();
  });

  it("clears the share token for the caller's wishlist", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockWishlistUpdate.mockResolvedValue({});

    const result = await revokeShareToken();

    expect(mockWishlistUpdate).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { shareToken: null },
    });
    expect(result).toEqual({ success: true });
  });
});
