import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  getAuthenticatedUserId,
  requireAuthenticatedUserId,
  requireOwned,
  wishlistCommand,
} from "../wishlist-command";
import { AuthorizationError, ValidationError } from "../action-result";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const mockAuth = auth as unknown as Mock;
const mockRevalidatePath = revalidatePath as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getAuthenticatedUserId / requireAuthenticatedUserId", () => {
  it("returns null when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await getAuthenticatedUserId()).toBeNull();
  });

  it("returns the session's user id", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    expect(await getAuthenticatedUserId()).toBe("user-1");
  });

  it("throws AuthorizationError with a default message when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireAuthenticatedUserId()).rejects.toThrow(AuthorizationError);
    await expect(requireAuthenticatedUserId()).rejects.toThrow("Unauthorized");
  });

  it("accepts a custom message", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireAuthenticatedUserId("Не авторизований")).rejects.toThrow(
      "Не авторизований",
    );
  });

  it("returns the user id when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    expect(await requireAuthenticatedUserId()).toBe("user-1");
  });
});

describe("requireOwned", () => {
  it("passes through the resolved value", async () => {
    expect(await requireOwned(Promise.resolve({ id: "item-1" }))).toEqual({ id: "item-1" });
  });

  it("reclassifies a rejection as AuthorizationError, preserving its message", async () => {
    await expect(requireOwned(Promise.reject(new Error("Item not found")))).rejects.toThrow(
      AuthorizationError,
    );
    await expect(requireOwned(Promise.reject(new Error("Item not found")))).rejects.toThrow(
      "Item not found",
    );
  });
});

describe("wishlistCommand", () => {
  it("wraps a successful handler's return value as {success:true,data}", async () => {
    const action = wishlistCommand(async (x: number) => x * 2);
    expect(await action(21)).toEqual({ success: true, data: 42 });
  });

  it("surfaces an AuthorizationError's message verbatim", async () => {
    const action = wishlistCommand(async () => {
      throw new AuthorizationError("Item not found");
    });
    expect(await action()).toEqual({ success: false, error: "Item not found" });
  });

  it("surfaces a ValidationError's message verbatim", async () => {
    const action = wishlistCommand(async () => {
      throw new ValidationError("Item name is required");
    });
    expect(await action()).toEqual({ success: false, error: "Item name is required" });
  });

  it("hides an unclassified error behind the default generic message", async () => {
    const action = wishlistCommand(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
    });
    expect(await action()).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });

  it("hides an unclassified error behind a custom generic message", async () => {
    const action = wishlistCommand(
      async () => {
        throw new Error("boom");
      },
      { genericErrorMessage: "Failed to add item" },
    );
    expect(await action()).toEqual({ success: false, error: "Failed to add item" });
  });

  it("revalidates the named targets on success", async () => {
    const action = wishlistCommand(async () => "ok", {
      revalidate: ["wishlistPage", "embedPage"],
    });

    await action();

    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/[username]", "page");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/embed/[username]", "page");
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("does not revalidate on failure", async () => {
    const action = wishlistCommand(
      async () => {
        throw new ValidationError("nope");
      },
      { revalidate: ["wishlistPage"] },
    );

    await action();

    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("passes arguments through to the handler", async () => {
    const action = wishlistCommand(async (a: string, b: number) => `${a}-${b}`);
    expect(await action("x", 1)).toEqual({ success: true, data: "x-1" });
  });
});
