import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateProfile } from "../update-profile";
import { auth } from "@/auth";
import { setTestRepository } from "@/lib/repository";
import { InMemoryWishlistRepository } from "@/lib/repository/in-memory-adapter";
import type { UserProfile, WishlistData } from "@/lib/repository/types";

const mockAuth = auth as unknown as Mock;

function makeUser(id: string, username: string | null = null): UserProfile {
  return {
    id,
    name: "Test User",
    email: `${id}@example.com`,
    emailVerified: null,
    image: null,
    username,
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

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

let repo: InMemoryWishlistRepository;

beforeEach(() => {
  repo = new InMemoryWishlistRepository();
  setTestRepository(repo);
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  repo.users.set("user-1", makeUser("user-1", "my-name"));
  repo.wishlists.set("wl-1", makeWishlist("wl-1", "user-1"));
});

describe("updateProfile — username validation", () => {
  it("rejects a username that is too short", async () => {
    const result = await updateProfile(formData({ name: "A", username: "ab" }));
    expect(result).toEqual({ success: false, error: expect.any(String) });
  });

  it("rejects a username with disallowed characters", async () => {
    const result = await updateProfile(formData({ name: "A", username: "bad_name!" }));
    expect(result.success).toBe(false);
  });

  it.each(["dashboard", "login", "embed", "api", "DASHBOARD"])(
    "rejects the reserved username %s",
    async (reserved) => {
      const result = await updateProfile(formData({ name: "A", username: reserved }));
      expect(result).toEqual({
        success: false,
        error: "Цей нікнейм зарезервовано системою",
      });
    },
  );

  it.each(["en", "uk"])(
    // Locale codes are also reserved, but at 2 characters they're already
    // rejected by the length check before the reserved-word check runs.
    "rejects the locale code %s (too short to reach the reserved-word check)",
    async (localeCode) => {
      const result = await updateProfile(formData({ name: "A", username: localeCode }));
      expect(result.success).toBe(false);
    },
  );

  it("rejects a username already taken by another user", async () => {
    repo.users.set("someone-else", makeUser("someone-else", "taken-name"));

    const result = await updateProfile(formData({ name: "A", username: "taken-name" }));

    expect(result).toEqual({ success: false, error: "Цей нікнейм вже зайнятий" });
  });

  it("allows re-saving your own current username", async () => {
    const result = await updateProfile(formData({ name: "A", username: "my-name" }));

    expect(result).toEqual({ success: true });
    expect(repo.users.get("user-1")?.username).toBe("my-name");
  });

  it("accepts a valid, available username", async () => {
    const result = await updateProfile(formData({ name: "A", username: "valid-name-123" }));

    expect(result).toEqual({ success: true });
    expect(repo.users.get("user-1")?.username).toBe("valid-name-123");
  });
});

describe("updateProfile — auth", () => {
  it("returns an authorization failure without writing", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateProfile(formData({ name: "A", username: "valid-name" }));

    expect(result).toEqual({ success: false, error: "Не авторизований" });
    expect(repo.users.get("user-1")?.username).toBe("my-name");
  });
});
