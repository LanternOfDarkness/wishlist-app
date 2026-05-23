import type {
  ViewerPageUser,
  WishlistAppearanceInfo,
  OwnedWishlistInfo,
  OwnedItemInfo,
  FollowRelation,
  DashboardUserData,
  EmbedWishlistData,
  UserProfile,
  ItemDraft,
  ItemData,
} from "./types";

export type LoadSpec =
  | { type: "viewer-page-user"; username: string }
  | { type: "wishlist-presentation"; userId: string; canViewPrivate: boolean; categories?: string[]; currency?: string; minPrice?: number; maxPrice?: number; sort?: string }
  | { type: "embed-presentation"; username: string }
  | { type: "owned-wishlist"; wishlistId: string; userId: string }
  | { type: "wishlist-appearance"; userId: string }
  | { type: "owned-item"; itemId: string; userId: string }
  | { type: "widget-item-count"; userId: string }
  | { type: "follow-status"; followerId: string; followingId: string }
  | { type: "dashboard-user"; userId: string }
  | { type: "user-by-id"; id: string }
  | { type: "user-by-username"; username: string }
  | { type: "user-by-email"; email: string };

export type RequireSpec =
  | { type: "owned-wishlist"; wishlistId: string; userId: string }
  | { type: "wishlist-appearance"; userId: string }
  | { type: "owned-item"; itemId: string; userId: string };

export type WriteCommand =
  | { type: "create-wishlist"; userId: string; title: string; slug: string }
  | { type: "add-item"; userId: string; item: ItemDraft }
  | { type: "toggle-follow"; followerId: string; followingId: string }
  | { type: "update-user-profile"; userId: string; name?: string; username?: string; appearance?: Record<string, unknown> }
  | { type: "update-widget-item-visibility"; itemId: string; showInWidget: boolean }
  | { type: "update-widget-settings"; wishlistId: string; appearance: Record<string, unknown> }
  | { type: "setup-user-account"; userId: string; username: string; title: string };

export interface SpecResultMap {
  "viewer-page-user": ViewerPageUser | null;
  "wishlist-presentation": {
    wishlist: { id: string; title: string; slug: string; appearance: Record<string, unknown> };
    items: Array<{
      id: string; name: string; url: string | null; imageUrl: string | null;
      price: number | null; currency: string; priority: number;
      isReserved: boolean; isPrivate: boolean; showInWidget: boolean;
      category: { id: string; name: string } | null;
    }>;
    maxPrice: number;
  } | null;
  "embed-presentation": EmbedWishlistData | null;
  "owned-wishlist": OwnedWishlistInfo | null;
  "wishlist-appearance": WishlistAppearanceInfo | null;
  "owned-item": OwnedItemInfo | null;
  "widget-item-count": number;
  "follow-status": FollowRelation | null;
  "dashboard-user": DashboardUserData | null;
  "user-by-id": UserProfile | null;
  "user-by-username": UserProfile | null;
  "user-by-email": UserProfile | null;
}

export interface IWishlistRepository {
  load<S extends LoadSpec>(spec: S): Promise<SpecResultMap[S["type"]]>;
  require<S extends RequireSpec>(spec: S & { message?: string }): Promise<
    Exclude<SpecResultMap[S["type"]], null>
  >;
  execute<T = unknown>(command: WriteCommand): Promise<T>;
}
