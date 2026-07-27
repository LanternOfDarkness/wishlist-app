import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/reservation", () => ({
  createReservation: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { reserveItem } from "../reserve-item";
import { auth } from "@/auth";
import { createReservation } from "@/lib/reservation";
import { revalidatePath } from "next/cache";

const mockAuth = auth as unknown as Mock;
const mockCreateReservation = createReservation as unknown as Mock;
const mockRevalidatePath = revalidatePath as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reserveItem", () => {
  it("passes the authenticated user id (or null for guests) through to createReservation", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCreateReservation.mockResolvedValue({ success: true, pledge: { id: "p1" } });

    await reserveItem({ itemId: "item-1", mode: "full" });

    expect(mockCreateReservation).toHaveBeenCalledWith(
      { itemId: "item-1", mode: "full" },
      "user-1",
    );
  });

  it("allows guests (no session) to reserve", async () => {
    mockAuth.mockResolvedValue(null);
    mockCreateReservation.mockResolvedValue({ success: true, pledge: { id: "p1" } });

    const result = await reserveItem({ itemId: "item-1", mode: "full" });

    expect(mockCreateReservation).toHaveBeenCalledWith({ itemId: "item-1", mode: "full" }, null);
    expect(result).toEqual({ success: true, data: { id: "p1" } });
  });

  it("revalidates the wishlist page on success", async () => {
    mockAuth.mockResolvedValue(null);
    mockCreateReservation.mockResolvedValue({ success: true, pledge: { id: "p1" } });

    await reserveItem({ itemId: "item-1", mode: "full" });

    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/[username]", "page");
  });

  it("does not revalidate on failure", async () => {
    mockAuth.mockResolvedValue(null);
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

  it("surfaces a not-found visibility denial the same as an authorization failure", async () => {
    mockAuth.mockResolvedValue(null);
    mockCreateReservation.mockResolvedValue({
      success: false,
      error: "Item not found",
    });

    const result = await reserveItem({ itemId: "item-1", mode: "full" });

    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("returns a generic error if createReservation throws", async () => {
    mockAuth.mockResolvedValue(null);
    mockCreateReservation.mockRejectedValue(new Error("DB down"));

    const result = await reserveItem({ itemId: "item-1", mode: "full" });

    expect(result).toEqual({
      success: false,
      error: "Failed to reserve item",
    });
  });
});
