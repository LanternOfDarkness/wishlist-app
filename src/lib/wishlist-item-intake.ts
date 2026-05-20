export interface WishlistItemMetadata {
  title?: string;
  image?: string;
  price?: number;
  currency?: string;
}

export interface WishlistItemDraft {
  url: string;
  name: string;
  imageUrl: string;
  price: string;
  currency: string;
  priority: string;
  isPrivate: boolean;
  categoryId: string;
  newCategoryName: string;
}

export interface WishlistItemIntakeInput {
  isPrivate?: boolean;
  name: string;
  url?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  priority?: number;
  wishlistId: string;
  categoryId?: string;
  newCategoryName?: string;
}

export interface NormalizedWishlistItemIntake {
  isPrivate: boolean;
  name: string;
  url?: string;
  imageUrl?: string;
  price?: number;
  currency: string;
  priority: number;
  wishlistId: string;
  categoryId?: string;
  newCategoryName?: string;
}

export const WISHLIST_ITEM_INTAKE_DEFAULTS = {
  currency: "UAH",
  priority: "3",
} as const;

export function createEmptyWishlistItemDraft(): WishlistItemDraft {
  return {
    url: "",
    name: "",
    imageUrl: "",
    price: "",
    currency: WISHLIST_ITEM_INTAKE_DEFAULTS.currency,
    priority: WISHLIST_ITEM_INTAKE_DEFAULTS.priority,
    isPrivate: false,
    categoryId: "",
    newCategoryName: "",
  };
}

export function applyMetadataToWishlistItemDraft(
  draft: WishlistItemDraft,
  metadata: WishlistItemMetadata,
): WishlistItemDraft {
  return {
    ...draft,
    name: metadata.title || draft.name,
    imageUrl: metadata.image || draft.imageUrl,
    price: typeof metadata.price === "number" ? String(metadata.price) : draft.price,
    currency: metadata.currency || draft.currency,
  };
}

export function normalizeWishlistItemIntake(
  input: WishlistItemIntakeInput,
): NormalizedWishlistItemIntake {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Item name is required");
  }

  const categoryId = normalizeOptionalString(input.categoryId);
  const newCategoryName = normalizeOptionalString(input.newCategoryName);

  return {
    isPrivate: input.isPrivate === true,
    name,
    url: normalizeOptionalString(input.url),
    imageUrl: normalizeOptionalString(input.imageUrl),
    price: normalizePrice(input.price),
    currency: normalizeCurrency(input.currency),
    priority: normalizePriority(input.priority),
    wishlistId: input.wishlistId,
    categoryId: categoryId === "new" ? undefined : categoryId,
    newCategoryName,
  };
}

function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizePrice(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function normalizeCurrency(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized || WISHLIST_ITEM_INTAKE_DEFAULTS.currency;
}

function normalizePriority(value: number | undefined) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return Number.parseInt(WISHLIST_ITEM_INTAKE_DEFAULTS.priority, 10);
  }

  return Math.min(Math.max(value, 1), 5);
}
