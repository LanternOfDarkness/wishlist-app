import { describe, expect, it } from "vitest";

import {
  getWishlistFilterUrlState,
  hasActiveWishlistFilters,
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
});

describe("hasActiveWishlistFilters", () => {
  it("reports active filters from search params", () => {
    expect(hasActiveWishlistFilters({})).toBe(false);
    expect(hasActiveWishlistFilters({ category: "cat-1" })).toBe(true);
    expect(hasActiveWishlistFilters({ minPrice: "0" })).toBe(true);
  });
});
