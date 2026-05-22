import type { IWishlistRepository, LoadSpec, RequireSpec, WriteCommand, SpecResultMap } from "./interface";
import type {
  UserProfile, WishlistData, ItemData, CategoryData, FollowRelation,
  ViewerPageUser, OwnedWishlistInfo, OwnedItemInfo, WishlistAppearanceInfo,
  DashboardUserData, EmbedWishlistData, ItemDraft,
} from "./types";

export class InMemoryWishlistRepository implements IWishlistRepository {
  users = new Map<string, UserProfile>();
  wishlists = new Map<string, WishlistData>();
  items = new Map<string, ItemData>();
  categories = new Map<string, CategoryData>();
  follows = new Map<string, FollowRelation>();

  async load<S extends LoadSpec>(spec: S): Promise<any> {
    switch (spec.type) {
      case "viewer-page-user": {
        const user = [...this.users.values()].find(u => u.username === spec.username);
        if (!user) return null as any;
        return {
          id: user.id,
          name: user.name,
          image: user.image,
          username: user.username,
          createdAt: user.createdAt,
          categories: [...this.categories.values()].filter(c => c.userId === user.id),
          followers: [...this.follows.values()]
            .filter(f => f.followingId === user.id)
            .map(f => ({ followerId: f.followerId })),
          following: [...this.follows.values()]
            .filter(f => f.followerId === user.id)
            .map(f => ({ followingId: f.followingId })),
        } as any;
      }

      case "wishlist-presentation": {
        const wishlist = [...this.wishlists.values()].find(w => w.userId === spec.userId);
        if (!wishlist) return null as any;
        let matchedItems = [...this.items.values()].filter(i => i.wishlistId === wishlist.id);
        if (!spec.canViewPrivate) matchedItems = matchedItems.filter(i => !i.isPrivate);
        if (spec.categories?.length) matchedItems = matchedItems.filter(i => i.categoryId && spec.categories!.includes(i.categoryId));
        if (spec.currency) matchedItems = matchedItems.filter(i => i.currency === spec.currency);
        if (spec.minPrice !== undefined) matchedItems = matchedItems.filter(i => i.price === null || i.price >= spec.minPrice!);
        if (spec.maxPrice !== undefined) matchedItems = matchedItems.filter(i => i.price === null || i.price <= spec.maxPrice!);
        matchedItems.sort((a, b) => {
          const pri = (b.priority ?? 0) - (a.priority ?? 0);
          if (pri !== 0) return pri;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        const prices = matchedItems.map(i => i.price).filter((p): p is number => p !== null);
        return {
          wishlist: {
            id: wishlist.id,
            title: wishlist.title,
            slug: wishlist.slug,
            appearance: wishlist.appearance,
          },
          items: matchedItems.map(i => ({
            ...i,
            category: i.categoryId ? this.categories.get(i.categoryId) ?? null : null,
          })),
          maxPrice: prices.length > 0 ? Math.max(...prices) : 10000,
        } as any;
      }

      case "embed-presentation": {
        const user = [...this.users.values()].find(u => u.username === spec.username);
        if (!user) return null as any;
        const wishlist = [...this.wishlists.values()].find(w => w.userId === user.id);
        if (!wishlist) return null as any;
        const publicItems = [...this.items.values()]
          .filter(i => i.wishlistId === wishlist.id && !i.isPrivate)
          .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || b.createdAt.getTime() - a.createdAt.getTime());
        return {
          user: { id: user.id, name: user.name, image: user.image, username: user.username },
          wishlist,
          items: publicItems,
        } as any;
      }

      case "owned-wishlist": {
        const w = [...this.wishlists.values()].find(
          w => w.id === spec.wishlistId && w.userId === spec.userId
        );
        return w ? { id: w.id, slug: w.slug } : null as any;
      }

      case "wishlist-appearance": {
        const w = [...this.wishlists.values()].find(w => w.userId === spec.userId);
        return w ? { id: w.id, appearance: w.appearance } : null as any;
      }

      case "owned-item": {
        const item = [...this.items.values()].find(i => {
          if (i.id !== spec.itemId) return false;
          const w = this.wishlists.get(i.wishlistId);
          return w?.userId === spec.userId;
        });
        return item ? { id: item.id, wishlistId: item.wishlistId } : null as any;
      }

      case "widget-item-count": {
        return [...this.items.values()].filter(i => {
          const w = this.wishlists.get(i.wishlistId);
          return w?.userId === spec.userId && i.showInWidget;
        }).length as any;
      }

      case "follow-status": {
        const f = [...this.follows.values()].find(
          f => f.followerId === spec.followerId && f.followingId === spec.followingId
        );
        return f ?? null as any;
      }

      case "dashboard-user": {
        const user = this.users.get(spec.userId);
        if (!user) return null as any;
        const w = [...this.wishlists.values()].find(w => w.userId === user.id);
        return {
          ...user,
          wishlist: w ? { ...w, items: [...this.items.values()].filter(i => i.wishlistId === w.id) } : null,
        } as any;
      }

      case "user-by-id": {
        const user = this.users.get(spec.id);
        return user ?? null as any;
      }

      case "user-by-username": {
        const user = [...this.users.values()].find(u => u.username === spec.username);
        return user ?? null as any;
      }

      case "user-by-email": {
        const user = [...this.users.values()].find(u => u.email === spec.email);
        return user ?? null as any;
      }
    }
  }

  async require<S extends RequireSpec>(spec: S & { message?: string }): Promise<any> {
    const result = await this.load(spec as any);
    if (result === null || result === undefined) {
      throw new Error(spec.message ?? `Required ${spec.type} not found`);
    }
    return result;
  }

  async execute<T = unknown>(command: WriteCommand): Promise<T> {
    switch (command.type) {
      case "create-wishlist": {
        const w: WishlistData = {
          id: crypto.randomUUID(),
          title: command.title,
          slug: command.slug,
          description: null,
          isPublic: true,
          appearance: {},
          userId: command.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.wishlists.set(w.id, w);
        return w as any;
      }

      case "add-item": {
        const draft = command.item as ItemDraft;
        let catId: string | null = draft.categoryId ?? null;
        if (draft.newCategoryName) {
          const cat: CategoryData = { id: crypto.randomUUID(), name: draft.newCategoryName, userId: command.userId, createdAt: new Date() };
          this.categories.set(cat.id, cat);
          catId = cat.id;
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
          showInWidget: false,
          wishlistId: draft.wishlistId,
          categoryId: catId,
          createdAt: new Date(),
        };
        this.items.set(item.id, item);
        return item as any;
      }

      case "toggle-follow": {
        const existing = [...this.follows.values()].find(
          f => f.followerId === command.followerId && f.followingId === command.followingId
        );
        if (existing) {
          this.follows.delete(`${command.followerId}:${command.followingId}`);
          return { followed: false } as any;
        }
        this.follows.set(`${command.followerId}:${command.followingId}`, {
          followerId: command.followerId,
          followingId: command.followingId,
        });
        return { followed: true } as any;
      }

      case "update-user-profile": {
        const user = this.users.get(command.userId);
        if (!user) throw new Error("User not found");
        const updated = { ...user };
        if (command.name !== undefined) updated.name = command.name;
        if (command.username !== undefined) updated.username = command.username;
        this.users.set(command.userId, updated);
        if (command.appearance !== undefined) {
          const w = [...this.wishlists.values()].find(w => w.userId === command.userId);
          if (w) {
            this.wishlists.set(w.id, { ...w, appearance: command.appearance as Record<string, unknown> });
          }
        }
        return undefined as any;
      }

      case "update-widget-item-visibility": {
        const item = this.items.get(command.itemId);
        if (!item) throw new Error("Item not found");
        this.items.set(command.itemId, { ...item, showInWidget: command.showInWidget });
        return undefined as any;
      }

      case "update-widget-settings": {
        const w = this.wishlists.get(command.wishlistId);
        if (!w) throw new Error("Wishlist not found");
        this.wishlists.set(command.wishlistId, {
          ...w,
          appearance: { ...w.appearance, ...command.appearance },
        });
        return undefined as any;
      }

      case "setup-user-account": {
        const user = this.users.get(command.userId);
        if (user) {
          this.users.set(command.userId, { ...user, username: command.username });
        }
        const existingWishlist = [...this.wishlists.values()].find(w => w.userId === command.userId);
        if (!existingWishlist) {
          const w: WishlistData = {
            id: crypto.randomUUID(),
            title: "Мої бажання",
            slug: command.username,
            description: null,
            isPublic: true,
            appearance: {},
            userId: command.userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.wishlists.set(w.id, w);
        }
        return undefined as any;
      }
    }
  }
}
