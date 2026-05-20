import { describe, expect, it } from "vitest";

import {
  buildWishlistItemOrderBy,
  getWishlistFilterUrlState,
  writeWishlistFilterParam,
} from "../wishlist-filter-state";

describe("wishlist filter state", () => {
  it("decodes URL state with stable defaults", () => {
    expect(getWishlistFilterUrlState(new URLSearchParams(), 500)).toEqual({
      currentCategories: [],
      currentSort: "priority",
      minPrice: "0",
      maxPrice: "500",
      currentCurrency: "",
    });
  });

  it("writes repeated filter params without mutating the source", () => {
    const source = new URLSearchParams("sort=newest&category=old");
    const next = writeWishlistFilterParam(source, "category", ["a", "b"]);

    expect(source.toString()).toBe("sort=newest&category=old");
    expect(next.getAll("category")).toEqual(["a", "b"]);
  });

  it("normalizes unknown sort values for query order", () => {
    expect(buildWishlistItemOrderBy("unknown")).toEqual([
      { priority: "desc" },
      { createdAt: "desc" },
    ]);
  });
});
