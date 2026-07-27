import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("../wishlist-command-context", () => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("../prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { getDashboardSettingsIntake } from "../dashboard-settings-intake";
import { getAuthenticatedUserId } from "../wishlist-command-context";
import { prisma } from "../prisma";

const mockGetAuthenticatedUserId = getAuthenticatedUserId as unknown as Mock;
const mockUserFind = prisma.user.findUnique as unknown as Mock;

describe("getDashboardSettingsIntake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for an unauthenticated caller", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);

    expect(await getDashboardSettingsIntake()).toBeNull();
    expect(mockUserFind).not.toHaveBeenCalled();
  });

  it("excludes archived items from the item query (regression: archived items were leaking into the widget picker)", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("owner-1");
    mockUserFind.mockResolvedValue({ id: "owner-1", wishlist: { items: [] } });

    await getDashboardSettingsIntake();

    expect(mockUserFind).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          wishlist: expect.objectContaining({
            include: expect.objectContaining({
              items: expect.objectContaining({
                where: expect.objectContaining({ isArchived: false }),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("still includes the owner's private items (this is the owner's own settings view)", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("owner-1");
    mockUserFind.mockResolvedValue({ id: "owner-1", wishlist: { items: [] } });

    await getDashboardSettingsIntake();

    const call = mockUserFind.mock.calls[0][0];
    expect(call.include.wishlist.include.items.where.isPrivate).toBeUndefined();
  });
});
