import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    wishlist: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { ensureUserWishlist, DEFAULT_WISHLIST_TITLE } from "../ensure-user-wishlist";
import { prisma } from "../prisma";

const mockFindUnique = prisma.wishlist.findUnique as unknown as Mock;
const mockCreate = prisma.wishlist.create as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ensureUserWishlist", () => {
  it("returns the existing wishlist without creating a new one", async () => {
    const existing = { id: "wl-1", userId: "user-1", slug: "user-1" };
    mockFindUnique.mockResolvedValue(existing);

    const result = await ensureUserWishlist("user-1", "user-1");

    expect(result).toBe(existing);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a wishlist with the default title when none exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "wl-new" });

    await ensureUserWishlist("user-1", "my-slug");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        title: DEFAULT_WISHLIST_TITLE,
        slug: "my-slug",
        appearance: {
          colorPreset: "paper",
          font: "font-sketch",
          itemBorder: "rounded-lg border-sketch",
        },
      },
    });
  });
});
