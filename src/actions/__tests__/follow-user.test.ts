import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/wishlist-command", () => ({
  requireAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    follows: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { followUser } from "../follow-user";
import { requireAuthenticatedUserId } from "@/lib/wishlist-command";
import { prisma } from "@/lib/prisma";

const mockRequireAuth = requireAuthenticatedUserId as unknown as Mock;
const mockFindUnique = prisma.follows.findUnique as unknown as Mock;
const mockCreate = prisma.follows.create as unknown as Mock;
const mockDelete = prisma.follows.delete as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("followUser", () => {
  it("rejects unauthenticated callers and performs no write", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    await expect(followUser("target-1", "/path")).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("rejects following yourself", async () => {
    mockRequireAuth.mockResolvedValue("user-1");

    await expect(followUser("user-1", "/path")).rejects.toThrow(
      "You cannot follow yourself",
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a follow when none exists", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockFindUnique.mockResolvedValue(null);

    const result = await followUser("target-1", "/path");

    expect(mockCreate).toHaveBeenCalledWith({
      data: { followerId: "user-1", followingId: "target-1" },
    });
    expect(result).toEqual({ success: true });
  });

  it("removes an existing follow (toggle off)", async () => {
    mockRequireAuth.mockResolvedValue("user-1");
    mockFindUnique.mockResolvedValue({
      followerId: "user-1",
      followingId: "target-1",
    });

    await followUser("target-1", "/path");

    expect(mockDelete).toHaveBeenCalledWith({
      where: {
        followerId_followingId: { followerId: "user-1", followingId: "target-1" },
      },
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
