import type { Prisma } from "@prisma/client";

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

export function buildWishlistItemWhere(
  searchParams: WishlistSearchParams,
  canViewPrivateItems: boolean,
): Prisma.ItemWhereInput {
  const where: Prisma.ItemWhereInput = {};

  if (searchParams.currency) {
    where.currency = searchParams.currency;
  }

  if (searchParams.category) {
    const categoryIds = Array.isArray(searchParams.category)
      ? searchParams.category
      : [searchParams.category];
    where.categoryId = { in: categoryIds };
  }

  const minPrice = Number.parseFloat(searchParams.minPrice || "");
  const maxPrice = Number.parseFloat(searchParams.maxPrice || "");
  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    where.price = {
      ...(!Number.isNaN(minPrice) ? { gte: minPrice } : {}),
      ...(!Number.isNaN(maxPrice) ? { lte: maxPrice } : {}),
    };
  }

  if (!canViewPrivateItems) {
    where.isPrivate = false;
  }

  return where;
}

export function buildWishlistItemOrderBy(
  sort?: string,
): Prisma.ItemOrderByWithRelationInput[] {
  switch (normalizeWishlistSort(sort)) {
    case "price_asc":
      return [{ price: "asc" }];
    case "price_desc":
      return [{ price: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    default:
      return [{ priority: "desc" }, { createdAt: "desc" }];
  }
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
