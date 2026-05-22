export type WishlistSort = "priority" | "price_asc" | "price_desc" | "newest";

export type WishlistSearchParams = {
  category?: string | string[];
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  currency?: string;
};

export const WISHLIST_SORT_OPTIONS: Array<{
  value: WishlistSort;
  labelKey: string;
}> = [
  { value: "priority", labelKey: "sortPriority" },
  { value: "price_asc", labelKey: "sortPriceAsc" },
  { value: "price_desc", labelKey: "sortPriceDesc" },
  { value: "newest", labelKey: "sortNewest" },
];

export function getWishlistFilterUrlState(
  searchParams: URLSearchParams,
  maxPriceOverall: number,
) {
  return {
    currentCategories: searchParams.getAll("category"),
    currentSort: normalizeWishlistSort(searchParams.get("sort")),
    minPrice: searchParams.get("minPrice") || "0",
    maxPrice: searchParams.get("maxPrice") || maxPriceOverall.toString(),
    currentCurrency: searchParams.get("currency") || "",
  };
}

export function writeWishlistFilterParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | string[],
) {
  const params = new URLSearchParams(searchParams.toString());

  if (Array.isArray(value)) {
    params.delete(key);
    value.forEach((entry) => params.append(key, entry));
    return params;
  }

  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }

  return params;
}

export function hasActiveWishlistFilters(searchParams: WishlistSearchParams) {
  return Boolean(
    searchParams.currency ||
      searchParams.category ||
      searchParams.minPrice ||
      searchParams.maxPrice,
  );
}

function normalizeWishlistSort(value: string | null | undefined): WishlistSort {
  return WISHLIST_SORT_OPTIONS.some((option) => option.value === value)
    ? (value as WishlistSort)
    : "priority";
}
