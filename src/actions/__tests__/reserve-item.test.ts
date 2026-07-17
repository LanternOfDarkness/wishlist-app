import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/wishlist-command-context", () => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/lib/reservation", () => ({
  createReservation: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { reserveItem } from "../reserve-item";
import { getAuthenticatedUserId } from "@/lib/wishlist-command-context";
import { createReservation } from "@/lib/reservation";
import { revalidatePath } from "next/cache";

const mockGetAuth = getAuthenticatedUserId as unknown as Mock;
const mockCreateReservation = createReservation as unknown as Mock;
const mockRevalidatePath = revalidatePath as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reserveItem", () => {
  it("passes the authenticated user id (or null for guests) through to createReservation", async () => {
    mockGetAuth.mockResolvedValue("user-1");
    mockCreateReservation.mockResolvedValue({ success: true, pledge: { id: "p1" } });

    await reserveItem({ itemId: "item-1", mode: "full" });

    expect(mockCreateReservation).toHaveBeenCalledWith(
      { itemId: "item-1", mode: "full" },
      "user-1",
    );
  });

  it("allows guests (no session) to reserve", async () => {
    mockGetAuth.mockResolvedValue(null);
    mockCreateReservation.mockResolvedValue({ success: true, pledge: { id: "p1" } });

    const result = await reserveItem({ itemId: "item-1", mode: "full" });

    expect(mockCreateReservation).toHaveBeenCalledWith(
      { itemId: "item-1", mode: "full" },
      null,
    );
    expect(result).toEqual({ success: true, pledge: { id: "p1" } });
  });

  it("revalidates the wishlist page on success", async () => {
    mockGetAuth.mockResolvedValue(null);
    mockCreateReservation.mockResolvedValue({ success: true, pledge: { id: "p1" } });

    await reserveItem({ itemId: "item-1", mode: "full" });

    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/[locale]/[username]",
      "page",
    );
  });

  it("does not revalidate on failure", async () => {
    mockGetAuth.mockResolvedValue(null);
    mockCreateReservation.mockResolvedValue({
      success: false,
      error: "Item is already reserved",
    });

    const result = await reserveItem({ itemId: "item-1", mode: "full" });

    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "Item is already reserved",
    });
  });

  it("returns a generic error if createReservation throws", async () => {
    mockGetAuth.mockResolvedValue(null);
    mockCreateReservation.mockRejectedValue(new Error("DB down"));

    const result = await reserveItem({ itemId: "item-1", mode: "full" });

    expect(result).toEqual({
      success: false,
      error: "Failed to reserve item",
    });
  });
});
