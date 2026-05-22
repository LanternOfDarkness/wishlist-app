import { prisma } from "@/lib/prisma";
import type { IWishlistRepository, LoadSpec, RequireSpec, WriteCommand, SpecResultMap } from "./interface";

export class PrismaWishlistRepository implements IWishlistRepository {
  async load<S extends LoadSpec>(spec: S): Promise<any> {
    switch (spec.type) {
      case "viewer-page-user": {
        const user = await prisma.user.findUnique({
          where: { username: spec.username },
          include: {
            categories: true,
            followers: { select: { followerId: true } },
            following: { select: { followingId: true } },
          },
        });
        if (!user) return null as any;
        return {
          id: user.id,
          name: user.name,
          image: user.image,
          username: user.username,
          createdAt: user.createdAt,
          categories: user.categories,
          followers: user.followers,
          following: user.following,
        } as any;
      }

      case "wishlist-presentation": {
        const wishlist = await prisma.wishlist.findUnique({
          where: { userId: spec.userId },
          include: {
            items: {
              where: {
                ...(!spec.canViewPrivate ? { isPrivate: false } : {}),
                ...(spec.categories?.length ? { categoryId: { in: spec.categories } } : {}),
                ...(spec.currency ? { currency: spec.currency } : {}),
                ...(spec.minPrice !== undefined ? { price: { gte: spec.minPrice } } : {}),
                ...(spec.maxPrice !== undefined ? { price: { lte: spec.maxPrice } } : {}),
              },
              orderBy: buildOrderBy(spec.sort),
              include: { category: true },
            },
          },
        });
        if (!wishlist) return null as any;
        const prices = wishlist.items
          .map((i) => i.price)
          .filter((p): p is number => p !== null);
        return {
          wishlist: {
            id: wishlist.id,
            title: wishlist.title,
            slug: wishlist.slug,
            appearance: (wishlist.appearance as Record<string, unknown>) ?? {},
          },
          items: wishlist.items.map((i) => ({
            ...i,
            category: i.category
              ? { id: i.category.id, name: i.category.name }
              : null,
          })),
          maxPrice: prices.length > 0 ? Math.max(...prices) : 10000,
        } as any;
      }

      case "embed-presentation": {
        const user = await prisma.user.findUnique({
          where: { username: spec.username },
          include: {
            wishlist: {
              include: {
                items: {
                  where: { isPrivate: false },
                  orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
                },
              },
            },
          },
        });
        if (!user?.wishlist) return null as any;
        return {
          user: {
            id: user.id,
            name: user.name,
            image: user.image,
            username: user.username,
          },
          wishlist: {
            id: user.wishlist.id,
            title: user.wishlist.title,
            description: user.wishlist.description,
            slug: user.wishlist.slug,
            isPublic: user.wishlist.isPublic,
            appearance: (user.wishlist.appearance as Record<string, unknown>) ?? {},
            userId: user.wishlist.userId,
            createdAt: user.wishlist.createdAt,
            updatedAt: user.wishlist.updatedAt,
          },
          items: user.wishlist.items,
        } as any;
      }

      case "owned-wishlist": {
        const w = await prisma.wishlist.findFirst({
          where: { id: spec.wishlistId, userId: spec.userId },
          select: { id: true, slug: true },
        });
        return w as any;
      }

      case "wishlist-appearance": {
        const w = await prisma.wishlist.findUnique({
          where: { userId: spec.userId },
          select: { id: true, appearance: true },
        });
        if (!w) return null as any;
        return {
          id: w.id,
          appearance: (w.appearance as Record<string, unknown>) ?? {},
        } as any;
      }

      case "owned-item": {
        const item = await prisma.item.findFirst({
          where: { id: spec.itemId, wishlist: { userId: spec.userId } },
          select: { id: true, wishlistId: true },
        });
        return item as any;
      }

      case "widget-item-count": {
        const count = await prisma.item.count({
          where: {
            wishlist: { userId: spec.userId },
            showInWidget: true,
          },
        });
        return count as any;
      }

      case "follow-status": {
        const follow = await prisma.follows.findUnique({
          where: {
            followerId_followingId: {
              followerId: spec.followerId,
              followingId: spec.followingId,
            },
          },
        });
        return follow as any;
      }

      case "dashboard-user": {
        const user = await prisma.user.findUnique({
          where: { id: spec.userId },
          include: {
            wishlist: {
              include: {
                items: { orderBy: { createdAt: "desc" } },
              },
            },
          },
        });
        if (!user) return null as any;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          username: user.username,
          createdAt: user.createdAt,
          wishlist: user.wishlist
            ? {
                id: user.wishlist.id,
                title: user.wishlist.title,
                description: user.wishlist.description,
                slug: user.wishlist.slug,
                isPublic: user.wishlist.isPublic,
                appearance: (user.wishlist.appearance as Record<string, unknown>) ?? {},
                userId: user.wishlist.userId,
                createdAt: user.wishlist.createdAt,
                updatedAt: user.wishlist.updatedAt,
                items: user.wishlist.items,
              }
            : null,
        } as any;
      }

      case "user-by-id": {
        const user = await prisma.user.findUnique({
          where: { id: spec.id },
          select: { id: true, name: true, email: true, image: true, username: true, createdAt: true },
        });
        return user as any;
      }

      case "user-by-username": {
        const user = await prisma.user.findUnique({
          where: { username: spec.username },
          select: { id: true, name: true, email: true, image: true, username: true, createdAt: true },
        });
        return user as any;
      }

      case "user-by-email": {
        const user = await prisma.user.findUnique({
          where: { email: spec.email },
          select: { id: true, name: true, email: true, image: true, username: true, createdAt: true },
        });
        return user as any;
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
        const wishlist = await prisma.wishlist.create({
          data: { title: command.title, slug: command.slug, userId: command.userId },
        });
        return wishlist as any;
      }

      case "add-item": {
        const draft = command.item;
        let categoryId: string | null | undefined = draft.categoryId;
        if (draft.newCategoryName) {
          const cat = await prisma.category.create({
            data: { name: draft.newCategoryName, userId: command.userId },
          });
          categoryId = cat.id;
        }
        const item = await prisma.item.create({
          data: {
            name: draft.name,
            url: draft.url ?? null,
            imageUrl: draft.imageUrl ?? null,
            price: draft.price ?? null,
            currency: draft.currency,
            priority: draft.priority,
            isPrivate: draft.isPrivate,
            wishlistId: draft.wishlistId,
            categoryId: categoryId ?? null,
          },
        });
        return item as any;
      }

      case "toggle-follow": {
        const existing = await prisma.follows.findUnique({
          where: {
            followerId_followingId: {
              followerId: command.followerId,
              followingId: command.followingId,
            },
          },
        });
        if (existing) {
          await prisma.follows.delete({
            where: {
              followerId_followingId: {
                followerId: command.followerId,
                followingId: command.followingId,
              },
            },
          });
          return { followed: false } as any;
        }
        await prisma.follows.create({
          data: { followerId: command.followerId, followingId: command.followingId },
        });
        return { followed: true } as any;
      }

      case "update-user-profile": {
        await prisma.user.update({
          where: { id: command.userId },
          data: {
            ...(command.name !== undefined ? { name: command.name } : {}),
            ...(command.username !== undefined ? { username: command.username } : {}),
            ...(command.appearance !== undefined
              ? { wishlist: { update: { appearance: command.appearance as any } } }
              : {}),
          },
        });
        return undefined as any;
      }

      case "update-widget-item-visibility": {
        await prisma.item.update({
          where: { id: command.itemId },
          data: { showInWidget: command.showInWidget },
        });
        return undefined as any;
      }

      case "update-widget-settings": {
        await prisma.wishlist.update({
          where: { id: command.wishlistId },
          data: { appearance: command.appearance as any },
        });
        return undefined as any;
      }

      case "setup-user-account": {
        await prisma.user.update({
          where: { id: command.userId },
          data: { username: command.username },
        });
        await prisma.wishlist.create({
          data: { userId: command.userId, title: "Мої бажання", slug: command.username },
        });
        return undefined as any;
      }
    }
  }
}

function buildOrderBy(sort?: string): any {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { createdAt: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    default:
      return [{ priority: "desc" }, { createdAt: "desc" }];
  }
}
