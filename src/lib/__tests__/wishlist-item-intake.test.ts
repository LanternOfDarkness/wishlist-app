import { describe, expect, it } from "vitest";

import {
  applyMetadataToWishlistItemDraft,
  createEmptyWishlistItemDraft,
  normalizeWishlistItemIntake,
} from "../wishlist-item-intake";

describe("wishlist item intake", () => {
  it("normalizes input before persistence", () => {
    expect(
      normalizeWishlistItemIntake({
        wishlistId: "wishlist-1",
        name: "  Keyboard  ",
        url: " https://example.com/item ",
        imageUrl: "",
        price: 42,
        currency: " usd ",
        priority: 9,
        categoryId: "new",
        newCategoryName: "  Desk  ",
        isPrivate: true,
      }),
    ).toEqual({
      wishlistId: "wishlist-1",
      name: "Keyboard",
      url: "https://example.com/item",
      imageUrl: undefined,
      price: 42,
      currency: "USD",
      priority: 5,
      categoryId: undefined,
      newCategoryName: "Desk",
      isPrivate: true,
    });
  });

  it("uses stable defaults and rejects blank names", () => {
    expect(() =>
      normalizeWishlistItemIntake({
        wishlistId: "wishlist-1",
        name: " ",
      }),
    ).toThrow("Item name is required");

    expect(
      normalizeWishlistItemIntake({
        wishlistId: "wishlist-1",
        name: "Book",
        price: Number.NaN,
      }),
    ).toMatchObject({
      currency: "UAH",
      priority: 3,
      price: undefined,
      isPrivate: false,
    });
  });

  it("applies metadata to a draft without erasing user-entered values", () => {
    const draft = {
      ...createEmptyWishlistItemDraft(),
      name: "Manual name",
      price: "10",
    };

    expect(
      applyMetadataToWishlistItemDraft(draft, {
        image: "https://example.com/image.jpg",
        currency: "EUR",
      }),
    ).toEqual({
      ...draft,
      imageUrl: "https://example.com/image.jpg",
      currency: "EUR",
    });
  });
});
