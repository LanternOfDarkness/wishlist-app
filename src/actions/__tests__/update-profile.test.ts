import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/wishlist-command-context", () => ({
  requireAuthenticatedUserId: vi.fn(),
  getOwnedWishlistAppearance: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/wishlist-appearance-form", () => ({
  buildWishlistAppearanceFromFormData: vi.fn(() => ({})),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateProfile } from "../update-profile";
import {
  requireAuthenticatedUserId,
  getOwnedWishlistAppearance,
} from "@/lib/wishlist-command-context";
import { prisma } from "@/lib/prisma";

const mockRequireAuth = requireAuthenticatedUserId as unknown as Mock;
const mockGetOwnedAppearance = getOwnedWishlistAppearance as unknown as Mock;
const mockUserFindUnique = prisma.user.findUnique as unknown as Mock;
const mockUserUpdate = prisma.user.update as unknown as Mock;

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue("user-1");
  mockGetOwnedAppearance.mockResolvedValue({ id: "wl-1", appearance: null });
  mockUserUpdate.mockResolvedValue({});
});

describe("updateProfile — username validation", () => {
  it("rejects a username that is too short", async () => {
    const result = await updateProfile(
      formData({ name: "A", username: "ab" }),
    );
    expect(result.error).toBeTruthy();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("rejects a username with disallowed characters", async () => {
    const result = await updateProfile(
      formData({ name: "A", username: "bad_name!" }),
    );
    expect(result.error).toBeTruthy();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it.each(["dashboard", "login", "embed", "api", "DASHBOARD"])(
    "rejects the reserved username %s",
    async (reserved) => {
      const result = await updateProfile(
        formData({ name: "A", username: reserved }),
      );
      expect(result).toEqual({ error: "Цей нікнейм зарезервовано системою" });
      expect(mockUserUpdate).not.toHaveBeenCalled();
    },
  );

  it.each(["en", "uk"])(
    // Locale codes are also reserved, but at 2 characters they're already
    // rejected by the length check before the reserved-word check runs.
    "rejects the locale code %s (too short to reach the reserved-word check)",
    async (localeCode) => {
      const result = await updateProfile(
        formData({ name: "A", username: localeCode }),
      );
      expect(result.error).toBeTruthy();
      expect(mockUserUpdate).not.toHaveBeenCalled();
    },
  );

  it("rejects a username already taken by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "someone-else" });

    const result = await updateProfile(
      formData({ name: "A", username: "taken-name" }),
    );

    expect(result).toEqual({ error: "Цей нікнейм вже зайнятий" });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("allows re-saving your own current username", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1" });

    const result = await updateProfile(
      formData({ name: "A", username: "my-name" }),
    );

    expect(result).toEqual({ success: true });
    expect(mockUserUpdate).toHaveBeenCalled();
  });

  it("accepts a valid, available username", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await updateProfile(
      formData({ name: "A", username: "valid-name-123" }),
    );

    expect(result).toEqual({ success: true });
    expect(mockUserUpdate).toHaveBeenCalled();
  });
});

describe("updateProfile — auth", () => {
  it("propagates authentication failure without writing", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Не авторизований"));

    await expect(
      updateProfile(formData({ name: "A", username: "valid-name" })),
    ).rejects.toThrow();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
