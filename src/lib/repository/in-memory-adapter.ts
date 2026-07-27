import { itemVisibilityFor } from "@/lib/wishlist-visibility";
import type {
  IWishlistRepository,
  LoadSpec,
  RequireSpec,
  WriteCommand,
  SpecResultMap,
  CommandResultMap,
} from "./interface";
import type {
  UserProfile,
  WishlistData,
  ItemData,
  CategoryData,
  FollowRelation,
} from "./types";

interface PledgeRecord {
  id: string;
  itemId: string;
  mode: "full" | "partial";
  amount: number | null;
  userId?: string | null;
  guestName?: string;
  message?: string;
  isAnonymous: boolean;
}

const MAX_WIDGET_ITEMS = 5;

function compareItemsForSort(a: ItemData, b: ItemData, sort?: string): number {
  switch (sort) {
    case "price_asc":
      return (a.price ?? 0) - (b.price ?? 0);
    case "price_desc":
      return (b.price ?? 0) - (a.price ?? 0);
    case "newest":
      return b.createdAt.getTime() - a.createdAt.getTime();
    default:
      return (
        (b.priority ?? 0) - (a.priority ?? 0) ||
        b.createdAt.getTime() - a.createdAt.getTime()
      );
  }
}

export class InMemoryWishlistRepository implements IWishlistRepository {
  users = new Map<string, UserProfile>();
  wishlists = new Map<string, WishlistData>();
  items = new Map<string, ItemData>();
  categories = new Map<string, CategoryData>();
  follows = new Map<string, FollowRelation>();
  pledges = new Map<string, PledgeRecord>();

  async load<S extends LoadSpec>(spec: S): Promise<SpecResultMap[S["type"]]> {
    return this.loadUntyped(spec) as unknown as SpecResultMap[S["type"]];
  }

  async require<S extends RequireSpec>(
    spec: S & { message?: string },
  ): Promise<Exclude<SpecResultMap[S["type"]], null>> {
    const result = await this.loadUntyped(spec);
    if (result === null || result === undefined) {
      throw new Error(spec.message ?? `Required ${spec.type} not found`);
    }
    return result as unknown as Exclude<SpecResultMap[S["type"]], null>;
  }

  async execute<C extends WriteCommand>(command: C): Promise<CommandResultMap[C["type"]]> {
    return this.executeUntyped(command) as unknown as CommandResultMap[C["type"]];
  }

  private async loadUntyped(
    spec: LoadSpec,
  ): Promise<SpecResultMap[LoadSpec["type"]]> {
    switch (spec.type) {
      case "viewer-page-user": {
        const user = [...this.users.values()].find((u) => u.username === spec.username);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          image: user.image,
          username: user.username,
          createdAt: user.createdAt,
          categories: [...this.categories.values()].filter((c) => c.userId === user.id),
          followers: [...this.follows.values()]
            .filter((f) => f.followingId === user.id)
            .map((f) => ({ followerId: f.followerId })),
          following: [...this.follows.values()]
            .filter((f) => f.followerId === user.id)
            .map((f) => ({ followingId: f.followingId })),
        };
      }

      case "wishlist-presentation": {
        const wishlist = [...this.wishlists.values()].find((w) => w.userId === spec.userId);
        if (!wishlist) return null;

        let matchedItems = [...this.items.values()].filter(
          (i) => i.wishlistId === wishlist.id,
        );
        if (!spec.itemVisibility.includeArchived) {
          matchedItems = matchedItems.filter((i) => !i.isArchived);
        }
        if (!spec.itemVisibility.includePrivate) {
          matchedItems = matchedItems.filter((i) => !i.isPrivate);
        }
        if (spec.categories?.length) {
          matchedItems = matchedItems.filter(
            (i) => i.categoryId && spec.categories!.includes(i.categoryId),
          );
        }
        if (spec.currency) {
          matchedItems = matchedItems.filter((i) => i.currency === spec.currency);
        }
        if (spec.minPrice !== undefined) {
          matchedItems = matchedItems.filter((i) => i.price === null || i.price >= spec.minPrice!);
        }
        if (spec.maxPrice !== undefined) {
          matchedItems = matchedItems.filter((i) => i.price === null || i.price <= spec.maxPrice!);
        }
        matchedItems.sort((a, b) => compareItemsForSort(a, b, spec.sort));

        const prices = matchedItems.map((i) => i.price).filter((p): p is number => p !== null);

        return {
          wishlist: {
            id: wishlist.id,
            title: wishlist.title,
            slug: wishlist.slug,
            isPublic: wishlist.isPublic,
            shareToken: wishlist.shareToken,
            appearance: wishlist.appearance,
          },
          items: matchedItems.map((i) => ({
            ...i,
            category: i.categoryId ? this.categories.get(i.categoryId) ?? null : null,
            pledges: [...this.pledges.values()]
              .filter((p) => p.itemId === i.id && p.mode === "partial")
              .map((p) => ({ amount: p.amount })),
          })),
          maxPrice: prices.length > 0 ? Math.max(...prices) : 10000,
        };
      }

      case "embed-presentation": {
        const user = [...this.users.values()].find((u) => u.username === spec.username);
        if (!user) return null;
        const wishlist = [...this.wishlists.values()].find((w) => w.userId === user.id);
        if (!wishlist) return null;

        const visibility = itemVisibilityFor("embed", {
          canViewWishlist: true,
          canViewPrivateItems: false,
        });
        const publicItems = [...this.items.values()]
          .filter(
            (i) =>
              i.wishlistId === wishlist.id &&
              (visibility.includePrivate || !i.isPrivate) &&
              (visibility.includeArchived || !i.isArchived),
          )
          .sort((a, b) => compareItemsForSort(a, b, undefined));

        return {
          user: { id: user.id, name: user.name, image: user.image, username: user.username },
          wishlist,
          items: publicItems,
        };
      }

      case "owned-wishlist": {
        const w = [...this.wishlists.values()].find(
          (w) => w.id === spec.wishlistId && w.userId === spec.userId,
        );
        return w ? { id: w.id, slug: w.slug } : null;
      }

      case "wishlist-appearance": {
        const w = [...this.wishlists.values()].find((w) => w.userId === spec.userId);
        return w ? { id: w.id, appearance: w.appearance } : null;
      }

      case "owned-item": {
        const item = [...this.items.values()].find((i) => {
          if (i.id !== spec.itemId) return false;
          const w = this.wishlists.get(i.wishlistId);
          return w?.userId === spec.userId;
        });
        return item ? { id: item.id, wishlistId: item.wishlistId } : null;
      }

      case "item-for-reservation": {
        const item = this.items.get(spec.itemId);
        if (!item) return null;
        const wishlist = this.wishlists.get(item.wishlistId);
        if (!wishlist) return null;

        return {
          id: item.id,
          price: item.price,
          isReserved: item.isReserved,
          isArchived: item.isArchived,
          isPrivate: item.isPrivate,
          wishlist: {
            id: wishlist.id,
            isPublic: wishlist.isPublic,
            shareToken: wishlist.shareToken,
            user: {
              id: wishlist.userId,
              followers: [...this.follows.values()]
                .filter((f) => f.followingId === wishlist.userId)
                .map((f) => ({ followerId: f.followerId })),
              following: [...this.follows.values()]
                .filter((f) => f.followerId === wishlist.userId)
                .map((f) => ({ followingId: f.followingId })),
            },
          },
        };
      }

      case "widget-item-count": {
        return [...this.items.values()].filter((i) => {
          const w = this.wishlists.get(i.wishlistId);
          return w?.userId === spec.userId && i.showInWidget;
        }).length;
      }

      case "follow-status": {
        const f = [...this.follows.values()].find(
          (f) => f.followerId === spec.followerId && f.followingId === spec.followingId,
        );
        return f ?? null;
      }

      case "dashboard-user": {
        const user = this.users.get(spec.userId);
        if (!user) return null;
        const w = [...this.wishlists.values()].find((w) => w.userId === user.id);
        const visibility = itemVisibilityFor("dashboard", {
          canViewWishlist: true,
          canViewPrivateItems: true,
        });
        return {
          ...user,
          wishlist: w
            ? {
                ...w,
                items: [...this.items.values()].filter(
                  (i) =>
                    i.wishlistId === w.id &&
                    (visibility.includeArchived || !i.isArchived),
                ),
              }
            : null,
        };
      }

      case "user-by-id": {
        return this.users.get(spec.id) ?? null;
      }

      case "user-by-username": {
        return [...this.users.values()].find((u) => u.username === spec.username) ?? null;
      }

      case "user-by-email": {
        return [...this.users.values()].find((u) => u.email === spec.email) ?? null;
      }
    }
  }

  private async executeUntyped(
    command: WriteCommand,
  ): Promise<CommandResultMap[WriteCommand["type"]]> {
    switch (command.type) {
      case "add-item": {
        const draft = command.item;
        let categoryId: string | null = draft.categoryId ?? null;
        if (draft.newCategoryName) {
          const cat: CategoryData = {
            id: crypto.randomUUID(),
            name: draft.newCategoryName,
            userId: command.userId,
            createdAt: new Date(),
          };
          this.categories.set(cat.id, cat);
          categoryId = cat.id;
        }
        const item: ItemData = {
          id: crypto.randomUUID(),
          name: draft.name,
          url: draft.url ?? null,
          imageUrl: draft.imageUrl ?? null,
          price: draft.price ?? null,
          currency: draft.currency,
          priority: draft.priority,
          isReserved: false,
          isPrivate: draft.isPrivate,
          isArchived: false,
          showInWidget: false,
          wishlistId: draft.wishlistId,
          categoryId,
          createdAt: new Date(),
        };
        this.items.set(item.id, item);
        return item;
      }

      case "update-item": {
        const existing = this.items.get(command.itemId);
        if (!existing) throw new Error("Item not found");
        const draft = command.item;
        let categoryId: string | null = draft.categoryId ?? null;
        if (draft.newCategoryName) {
          const cat: CategoryData = {
            id: crypto.randomUUID(),
            name: draft.newCategoryName,
            userId: command.userId,
            createdAt: new Date(),
          };
          this.categories.set(cat.id, cat);
          categoryId = cat.id;
        }
        const updated: ItemData = {
          ...existing,
          name: draft.name,
          url: draft.url ?? null,
          imageUrl: draft.imageUrl ?? null,
          price: draft.price ?? null,
          currency: draft.currency,
          priority: draft.priority,
          isPrivate: draft.isPrivate,
          categoryId,
        };
        this.items.set(command.itemId, updated);
        return updated;
      }

      case "delete-item": {
        this.items.delete(command.itemId);
        return undefined;
      }

      case "set-item-archived": {
        const existing = this.items.get(command.itemId);
        if (!existing) throw new Error("Item not found");
        const updated = { ...existing, isArchived: command.archived };
        this.items.set(command.itemId, updated);
        return updated;
      }

      case "toggle-follow": {
        const existing = [...this.follows.values()].find(
          (f) => f.followerId === command.followerId && f.followingId === command.followingId,
        );
        if (existing) {
          this.follows.delete(`${command.followerId}:${command.followingId}`);
          return { followed: false };
        }
        this.follows.set(`${command.followerId}:${command.followingId}`, {
          followerId: command.followerId,
          followingId: command.followingId,
        });
        return { followed: true };
      }

      case "update-user-profile": {
        const user = this.users.get(command.userId);
        if (!user) throw new Error("User not found");
        const updated = { ...user };
        if (command.name !== undefined) updated.name = command.name;
        if (command.username !== undefined) updated.username = command.username;
        this.users.set(command.userId, updated);
        if (command.appearance !== undefined || command.isPublic !== undefined) {
          const w = [...this.wishlists.values()].find((w) => w.userId === command.userId);
          if (w) {
            this.wishlists.set(w.id, {
              ...w,
              ...(command.appearance !== undefined
                ? { appearance: command.appearance as Record<string, unknown> }
                : {}),
              ...(command.isPublic !== undefined ? { isPublic: command.isPublic } : {}),
            });
          }
        }
        return undefined;
      }

      case "update-widget-item-visibility": {
        const item = this.items.get(command.itemId);
        if (!item) throw new Error("Item not found");
        if (command.showInWidget) {
          const count = [...this.items.values()].filter((i) => {
            const w = this.wishlists.get(i.wishlistId);
            return w?.userId === command.userId && i.showInWidget;
          }).length;
          if (count >= MAX_WIDGET_ITEMS) {
            return { success: false, error: "limit-exceeded" };
          }
        }
        this.items.set(command.itemId, { ...item, showInWidget: command.showInWidget });
        return { success: true };
      }

      case "update-widget-settings": {
        const w = this.wishlists.get(command.wishlistId);
        if (!w) throw new Error("Wishlist not found");
        this.wishlists.set(command.wishlistId, {
          ...w,
          appearance: { ...w.appearance, ...command.appearance },
        });
        return undefined;
      }

      case "setup-user-account": {
        const user = this.users.get(command.userId);
        if (user) {
          this.users.set(command.userId, { ...user, username: command.username });
        }
        const existingWishlist = [...this.wishlists.values()].find(
          (w) => w.userId === command.userId,
        );
        if (!existingWishlist) {
          const w: WishlistData = {
            id: crypto.randomUUID(),
            title: command.title,
            slug: command.username,
            description: null,
            isPublic: true,
            shareToken: null,
            appearance: {},
            userId: command.userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.wishlists.set(w.id, w);
        }
        return undefined;
      }

      case "create-pledge": {
        const item = this.items.get(command.itemId);
        if (!item) throw new Error("Item not found");

        if (command.mode === "full") {
          // No `await` between this check and the mutation below, so two
          // "concurrent" calls (e.g. via Promise.all) can't interleave here
          // — the second call always observes the first's write. This
          // mirrors the DB's atomic compare-and-swap.
          if (item.isReserved) {
            return { success: false, error: "Item is already reserved" };
          }
          this.items.set(item.id, { ...item, isReserved: true });
          const pledge: PledgeRecord = {
            id: crypto.randomUUID(),
            itemId: item.id,
            mode: "full",
            amount: null,
            userId: command.userId,
            guestName: command.guestName,
            message: command.message,
            isAnonymous: command.isAnonymous ?? false,
          };
          this.pledges.set(pledge.id, pledge);
          return { success: true, pledgeId: pledge.id };
        }

        if (item.price == null || item.price <= 0) {
          return { success: false, error: "This item does not support partial contributions" };
        }
        const amount = command.amount;
        if (typeof amount !== "number" || !Number.isFinite(amount) || !(amount > 0)) {
          return { success: false, error: "A valid contribution amount is required" };
        }
        if (item.isReserved) {
          return { success: false, error: "Item is already reserved" };
        }

        const pledge: PledgeRecord = {
          id: crypto.randomUUID(),
          itemId: item.id,
          mode: "partial",
          amount,
          userId: command.userId,
          guestName: command.guestName,
          message: command.message,
          isAnonymous: command.isAnonymous ?? false,
        };
        this.pledges.set(pledge.id, pledge);

        const pledgedTotal = [...this.pledges.values()]
          .filter((p) => p.itemId === item.id && p.mode === "partial")
          .reduce((sum, p) => sum + (p.amount ?? 0), 0);
        if (pledgedTotal >= item.price) {
          this.items.set(item.id, { ...this.items.get(item.id)!, isReserved: true });
        }

        return { success: true, pledgeId: pledge.id };
      }

      case "regenerate-share-token": {
        const w = [...this.wishlists.values()].find((w) => w.userId === command.userId);
        if (!w) throw new Error("Wishlist not found");
        const shareToken = crypto.randomUUID().replace(/-/g, "");
        this.wishlists.set(w.id, { ...w, shareToken });
        return { shareToken };
      }

      case "revoke-share-token": {
        const w = [...this.wishlists.values()].find((w) => w.userId === command.userId);
        if (!w) throw new Error("Wishlist not found");
        this.wishlists.set(w.id, { ...w, shareToken: null });
        return undefined;
      }
    }
  }
}
