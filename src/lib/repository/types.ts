export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  username: string | null;
  createdAt: Date;
}

export interface WishlistData {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isPublic: boolean;
  shareToken: string | null;
  appearance: Record<string, unknown>;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OwnedWishlistInfo {
  id: string;
  slug: string;
}

export interface WishlistAppearanceInfo {
  id: string;
  appearance: Record<string, unknown>;
}

export interface ItemData {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  priority: number;
  isReserved: boolean;
  isPrivate: boolean;
  isArchived: boolean;
  showInWidget: boolean;
  wishlistId: string;
  categoryId: string | null;
  createdAt: Date;
}

export interface ItemWithCategory extends ItemData {
  category: CategoryData | null;
}

export interface OwnedItemInfo {
  id: string;
  wishlistId: string;
}

export interface CategoryData {
  id: string;
  name: string;
  userId: string | null;
  createdAt: Date;
}

export interface FollowRelation {
  followerId: string;
  followingId: string;
}

export interface ViewerPageUser {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
  createdAt: Date;
  categories: CategoryData[];
  followers: Array<{ followerId: string }>;
  following: Array<{ followingId: string }>;
}

export interface DashboardUserData {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  username: string | null;
  createdAt: Date;
  wishlist: (WishlistData & { items: ItemData[] }) | null;
}

export interface EmbedWishlistData {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    username: string | null;
  };
  wishlist: WishlistData;
  items: ItemData[];
}

export interface WidgetItemData {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  url: string | null;
  imageUrl: string | null;
  showInWidget: boolean;
}

export interface ItemDraft {
  name: string;
  url?: string;
  imageUrl?: string;
  price?: number;
  currency: string;
  priority: number;
  isPrivate: boolean;
  wishlistId: string;
  categoryId?: string;
  newCategoryName?: string;
}

/** The `wishlist-presentation` load spec's result — named per Phase 3a so
 *  every sibling in SpecResultMap uses a named type from this file instead
 *  of an inline shape. */
export interface WishlistPresentationItem {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  priority: number;
  isReserved: boolean;
  isPrivate: boolean;
  isArchived: boolean;
  showInWidget: boolean;
  category: { id: string; name: string } | null;
  /** Partial-pledge amounts only; guest names/messages are never loaded here. */
  pledges: Array<{ amount: number | null }>;
}

export interface WishlistPresentationWishlist {
  id: string;
  title: string;
  slug: string;
  isPublic: boolean;
  shareToken: string | null;
  appearance: Record<string, unknown>;
}

export interface WishlistPresentationData {
  wishlist: WishlistPresentationWishlist;
  items: WishlistPresentationItem[];
  maxPrice: number;
}

/** The shape `reservation.ts` needs to run its visibility gate and mutation. */
export interface ItemForReservation {
  id: string;
  price: number | null;
  isReserved: boolean;
  isArchived: boolean;
  isPrivate: boolean;
  wishlist: {
    id: string;
    isPublic: boolean;
    shareToken: string | null;
    user: {
      id: string;
      followers: Array<{ followerId: string }>;
      following: Array<{ followingId: string }>;
    };
  };
}

export type CreatePledgeResult =
  | { success: true; pledgeId: string }
  | { success: false; error: string };

export type UpdateWidgetItemVisibilityResult =
  | { success: true }
  | { success: false; error: "limit-exceeded" | "conflict" };
