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
  WishlistPresentationData,
  ItemForReservation,
  CreatePledgeResult,
  UpdateWidgetItemVisibilityResult,
} from "./types";
import type { ItemVisibility } from "../wishlist-visibility";

export type LoadSpec =
  | { type: "viewer-page-user"; username: string }
  | {
      type: "wishlist-presentation";
      userId: string;
      itemVisibility: ItemVisibility;
      categories?: string[];
      currency?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
    }
  | { type: "embed-presentation"; username: string }
  | { type: "owned-wishlist"; wishlistId: string; userId: string }
  | { type: "wishlist-appearance"; userId: string }
  | { type: "owned-item"; itemId: string; userId: string }
  | { type: "item-for-reservation"; itemId: string }
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
  | { type: "add-item"; userId: string; item: ItemDraft }
  | {
      type: "update-item";
      itemId: string;
      userId: string;
      item: Omit<ItemDraft, "wishlistId">;
    }
  | { type: "delete-item"; itemId: string }
  | { type: "set-item-archived"; itemId: string; archived: boolean }
  | { type: "toggle-follow"; followerId: string; followingId: string }
  | {
      type: "update-user-profile";
      userId: string;
      name?: string;
      username?: string;
      appearance?: Record<string, unknown>;
    }
  | {
      type: "update-widget-item-visibility";
      itemId: string;
      userId: string;
      showInWidget: boolean;
    }
  | { type: "update-widget-settings"; wishlistId: string; appearance: Record<string, unknown> }
  | { type: "setup-user-account"; userId: string; username: string; title: string }
  | {
      type: "create-pledge";
      itemId: string;
      userId: string | null;
      mode: "full" | "partial";
      amount?: number;
      message?: string;
      guestName?: string;
      isAnonymous?: boolean;
    }
  | { type: "regenerate-share-token"; userId: string }
  | { type: "revoke-share-token"; userId: string };

export interface SpecResultMap {
  "viewer-page-user": ViewerPageUser | null;
  "wishlist-presentation": WishlistPresentationData | null;
  "embed-presentation": EmbedWishlistData | null;
  "owned-wishlist": OwnedWishlistInfo | null;
  "wishlist-appearance": WishlistAppearanceInfo | null;
  "owned-item": OwnedItemInfo | null;
  "item-for-reservation": ItemForReservation | null;
  "widget-item-count": number;
  "follow-status": FollowRelation | null;
  "dashboard-user": DashboardUserData | null;
  "user-by-id": UserProfile | null;
  "user-by-username": UserProfile | null;
  "user-by-email": UserProfile | null;
}

export interface CommandResultMap {
  "add-item": ItemData;
  "update-item": ItemData;
  "delete-item": void;
  "set-item-archived": ItemData;
  "toggle-follow": { followed: boolean };
  "update-user-profile": void;
  "update-widget-item-visibility": UpdateWidgetItemVisibilityResult;
  "update-widget-settings": void;
  "setup-user-account": void;
  "create-pledge": CreatePledgeResult;
  "regenerate-share-token": { shareToken: string };
  "revoke-share-token": void;
}

export interface IWishlistRepository {
  load<S extends LoadSpec>(spec: S): Promise<SpecResultMap[S["type"]]>;
  require<S extends RequireSpec>(spec: S & { message?: string }): Promise<
    Exclude<SpecResultMap[S["type"]], null>
  >;
  execute<C extends WriteCommand>(command: C): Promise<CommandResultMap[C["type"]]>;
}
