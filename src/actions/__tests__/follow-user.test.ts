import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { followUser } from "../follow-user";
import { auth } from "@/auth";
import { setTestRepository } from "@/lib/repository";
import { InMemoryWishlistRepository } from "@/lib/repository/in-memory-adapter";

const mockAuth = auth as unknown as Mock;

let repo: InMemoryWishlistRepository;

beforeEach(() => {
  repo = new InMemoryWishlistRepository();
  setTestRepository(repo);
  vi.clearAllMocks();
});

describe("followUser", () => {
  it("rejects unauthenticated callers and performs no write", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(followUser("target-1", "/path")).rejects.toThrow();
    expect(repo.follows.size).toBe(0);
  });

  it("rejects following yourself", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(followUser("user-1", "/path")).rejects.toThrow(
      "You cannot follow yourself",
    );
    expect(repo.follows.size).toBe(0);
  });

  it("creates a follow when none exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const result = await followUser("target-1", "/path");

    expect([...repo.follows.values()]).toEqual([
      { followerId: "user-1", followingId: "target-1" },
    ]);
    expect(result).toEqual({ success: true });
  });

  it("removes an existing follow (toggle off)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    repo.follows.set("user-1:target-1", { followerId: "user-1", followingId: "target-1" });

    await followUser("target-1", "/path");

    expect(repo.follows.size).toBe(0);
  });
});
