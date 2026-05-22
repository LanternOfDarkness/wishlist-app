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
