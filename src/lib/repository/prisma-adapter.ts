import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  buildWishlistItemOrderBy,
  buildWishlistItemWhere,
} from "@/lib/wishlist-filter-state";
import { itemVisibilityFor } from "@/lib/wishlist-visibility";
import type {
  IWishlistRepository,
  LoadSpec,
  RequireSpec,
  WriteCommand,
  SpecResultMap,
  CommandResultMap,
} from "./interface";

function normalizeAppearance(raw: unknown): Record<string, unknown> {
  return (raw as Record<string, unknown>) ?? {};
}

const MAX_WIDGET_ITEMS = 5;

class WidgetLimitExceededError extends Error {}

// Postgres error code for "could not serialize access due to concurrent
// update" — the write-conflict Prisma surfaces as P2034 under Serializable
// isolation. See https://www.prisma.io/docs/orm/reference/error-reference#p2034
const SERIALIZATION_FAILURE_CODE = "P2034";

function isSerializationFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === SERIALIZATION_FAILURE_CODE
  );
}

export class PrismaWishlistRepository implements IWishlistRepository {
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
        const user = await prisma.user.findUnique({
          where: { username: spec.username },
          include: {
            categories: true,
            followers: { select: { followerId: true } },
            following: { select: { followingId: true } },
          },
        });
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          image: user.image,
          username: user.username,
          createdAt: user.createdAt,
          categories: user.categories,
          followers: user.followers,
          following: user.following,
        };
      }

      case "wishlist-presentation": {
        const itemWhere = buildWishlistItemWhere(
          {
            category: spec.categories,
            currency: spec.currency,
            minPrice: spec.minPrice?.toString(),
            maxPrice: spec.maxPrice?.toString(),
          },
          spec.itemVisibility,
        );

        const wishlist = await prisma.wishlist.findUnique({
          where: { userId: spec.userId },
          include: {
            items: {
              where: itemWhere,
              orderBy: buildWishlistItemOrderBy(spec.sort),
              include: {
                category: true,
                // Only partial-pledge amounts are needed for the progress
                // bar; guest names/messages are never fetched here at all.
                pledges: { where: { mode: "partial" }, select: { amount: true } },
              },
            },
          },
        });
        if (!wishlist) return null;

        const prices = wishlist.items
          .map((i) => i.price)
          .filter((p): p is number => p !== null);

        return {
          wishlist: {
            id: wishlist.id,
            title: wishlist.title,
            slug: wishlist.slug,
            isPublic: wishlist.isPublic,
            shareToken: wishlist.shareToken,
            appearance: normalizeAppearance(wishlist.appearance),
          },
          items: wishlist.items.map((i) => ({
            ...i,
            category: i.category ? { id: i.category.id, name: i.category.name } : null,
          })),
          maxPrice: prices.length > 0 ? Math.max(...prices) : 10000,
        };
      }

      case "embed-presentation": {
        const itemWhere = buildWishlistItemWhere(
          {},
          itemVisibilityFor("embed", { canViewWishlist: true, canViewPrivateItems: false }),
        );

        const user = await prisma.user.findUnique({
          where: { username: spec.username },
          include: {
            wishlist: {
              include: {
                items: {
                  where: itemWhere,
                  orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
                },
              },
            },
          },
        });
        if (!user?.wishlist) return null;

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
            shareToken: user.wishlist.shareToken,
            appearance: normalizeAppearance(user.wishlist.appearance),
            userId: user.wishlist.userId,
            createdAt: user.wishlist.createdAt,
            updatedAt: user.wishlist.updatedAt,
          },
          items: user.wishlist.items,
        };
      }

      case "owned-wishlist": {
        return prisma.wishlist.findFirst({
          where: { id: spec.wishlistId, userId: spec.userId },
          select: { id: true, slug: true },
        });
      }

      case "wishlist-appearance": {
        const w = await prisma.wishlist.findUnique({
          where: { userId: spec.userId },
          select: { id: true, appearance: true },
        });
        if (!w) return null;
        return { id: w.id, appearance: normalizeAppearance(w.appearance) };
      }

      case "owned-item": {
        return prisma.item.findFirst({
          where: { id: spec.itemId, wishlist: { userId: spec.userId } },
          select: { id: true, wishlistId: true },
        });
      }

      case "item-for-reservation": {
        return prisma.item.findUnique({
          where: { id: spec.itemId },
          select: {
            id: true,
            price: true,
            isReserved: true,
            isArchived: true,
            isPrivate: true,
            wishlist: {
              select: {
                id: true,
                isPublic: true,
                shareToken: true,
                user: {
                  select: {
                    id: true,
                    followers: { select: { followerId: true } },
                    following: { select: { followingId: true } },
                  },
                },
              },
            },
          },
        });
      }

      case "widget-item-count": {
        return prisma.item.count({
          where: { wishlist: { userId: spec.userId }, showInWidget: true },
        });
      }

      case "follow-status": {
        return prisma.follows.findUnique({
          where: {
            followerId_followingId: {
              followerId: spec.followerId,
              followingId: spec.followingId,
            },
          },
        });
      }

      case "dashboard-user": {
        // The owner's own dashboard: sees its own private items, never
        // archived ones (see wishlist-visibility.ts's "dashboard" surface).
        const itemWhere = buildWishlistItemWhere(
          {},
          itemVisibilityFor("dashboard", { canViewWishlist: true, canViewPrivateItems: true }),
        );

        const user = await prisma.user.findUnique({
          where: { id: spec.userId },
          include: {
            wishlist: {
              include: {
                items: {
                  where: itemWhere,
                  orderBy: { createdAt: "desc" },
                  select: {
                    id: true,
                    name: true,
                    url: true,
                    imageUrl: true,
                    price: true,
                    currency: true,
                    priority: true,
                    isReserved: true,
                    isPrivate: true,
                    isArchived: true,
                    showInWidget: true,
                    wishlistId: true,
                    categoryId: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        });
        if (!user) return null;

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
                shareToken: user.wishlist.shareToken,
                appearance: normalizeAppearance(user.wishlist.appearance),
                userId: user.wishlist.userId,
                createdAt: user.wishlist.createdAt,
                updatedAt: user.wishlist.updatedAt,
                items: user.wishlist.items,
              }
            : null,
        };
      }

      case "user-by-id": {
        return prisma.user.findUnique({
          where: { id: spec.id },
          select: { id: true, name: true, email: true, emailVerified: true, image: true, username: true, createdAt: true },
        });
      }

      case "user-by-username": {
        return prisma.user.findUnique({
          where: { username: spec.username },
          select: { id: true, name: true, email: true, emailVerified: true, image: true, username: true, createdAt: true },
        });
      }

      case "user-by-email": {
        return prisma.user.findUnique({
          where: { email: spec.email },
          select: { id: true, name: true, email: true, emailVerified: true, image: true, username: true, createdAt: true },
        });
      }
    }
  }

  private async executeUntyped(
    command: WriteCommand,
  ): Promise<CommandResultMap[WriteCommand["type"]]> {
    switch (command.type) {
      case "add-item": {
        const draft = command.item;
        let categoryId: string | null | undefined = draft.categoryId;
        if (draft.newCategoryName) {
          const cat = await prisma.category.create({
            data: { name: draft.newCategoryName, userId: command.userId },
          });
          categoryId = cat.id;
        }
        return prisma.item.create({
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
      }

      case "update-item": {
        const draft = command.item;
        let categoryId: string | null | undefined = draft.categoryId;
        if (draft.newCategoryName) {
          const cat = await prisma.category.create({
            data: { name: draft.newCategoryName, userId: command.userId },
          });
          categoryId = cat.id;
        }
        return prisma.item.update({
          where: { id: command.itemId },
          data: {
            name: draft.name,
            url: draft.url ?? null,
            imageUrl: draft.imageUrl ?? null,
            price: draft.price ?? null,
            currency: draft.currency,
            priority: draft.priority,
            isPrivate: draft.isPrivate,
            categoryId: categoryId ?? null,
          },
        });
      }

      case "delete-item": {
        await prisma.item.delete({ where: { id: command.itemId } });
        return undefined;
      }

      case "set-item-archived": {
        return prisma.item.update({
          where: { id: command.itemId },
          data: { isArchived: command.archived },
        });
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
          return { followed: false };
        }
        await prisma.follows.create({
          data: { followerId: command.followerId, followingId: command.followingId },
        });
        return { followed: true };
      }

      case "update-user-profile": {
        const wishlistUpdate = {
          ...(command.appearance !== undefined
            ? { appearance: command.appearance as Prisma.InputJsonObject }
            : {}),
          ...(command.isPublic !== undefined ? { isPublic: command.isPublic } : {}),
        };

        await prisma.user.update({
          where: { id: command.userId },
          data: {
            ...(command.name !== undefined ? { name: command.name } : {}),
            ...(command.username !== undefined ? { username: command.username } : {}),
            ...(Object.keys(wishlistUpdate).length > 0
              ? { wishlist: { update: wishlistUpdate } }
              : {}),
          },
        });
        return undefined;
      }

      case "update-widget-item-visibility": {
        try {
          // Serializable isolation closes the count-then-update race: if two
          // concurrent requests would both read a count under the limit and
          // both try to push it over, Postgres aborts one with a
          // serialization failure instead of silently exceeding the cap.
          await prisma.$transaction(
            async (tx) => {
              if (command.showInWidget) {
                const count = await tx.item.count({
                  where: { wishlist: { userId: command.userId }, showInWidget: true },
                });
                if (count >= MAX_WIDGET_ITEMS) {
                  throw new WidgetLimitExceededError();
                }
              }
              await tx.item.update({
                where: { id: command.itemId },
                data: { showInWidget: command.showInWidget },
              });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          );
        } catch (error) {
          if (error instanceof WidgetLimitExceededError) {
            return { success: false, error: "limit-exceeded" };
          }
          if (isSerializationFailure(error)) {
            return { success: false, error: "conflict" };
          }
          throw error;
        }
        return { success: true };
      }

      case "update-widget-settings": {
        await prisma.wishlist.update({
          where: { id: command.wishlistId },
          data: { appearance: command.appearance as Prisma.InputJsonObject },
        });
        return undefined;
      }

      case "setup-user-account": {
        await prisma.user.update({
          where: { id: command.userId },
          data: { username: command.username },
        });
        await prisma.wishlist.create({
          data: { userId: command.userId, title: command.title, slug: command.username },
        });
        return undefined;
      }

      case "create-pledge": {
        if (command.mode === "full") {
          return prisma.$transaction(async (tx) => {
            // Atomic compare-and-swap: only succeeds if the item was still
            // unreserved at the moment of the update. Under concurrent
            // requests, Postgres row-locks this update so exactly one
            // caller sees count === 1.
            const updated = await tx.item.updateMany({
              where: { id: command.itemId, isReserved: false },
              data: { isReserved: true },
            });
            if (updated.count === 0) {
              return { success: false, error: "Item is already reserved" };
            }
            const pledge = await tx.pledge.create({
              data: {
                itemId: command.itemId,
                mode: "full",
                userId: command.userId ?? undefined,
                guestName: command.guestName,
                message: command.message,
                isAnonymous: command.isAnonymous ?? false,
              },
              select: { id: true },
            });
            return { success: true, pledgeId: pledge.id };
          });
        }

        const item = await prisma.item.findUnique({
          where: { id: command.itemId },
          select: { price: true },
        });
        if (!item || item.price == null || item.price <= 0) {
          return { success: false, error: "This item does not support partial contributions" };
        }

        const amount = command.amount;
        if (typeof amount !== "number" || !Number.isFinite(amount) || !(amount > 0)) {
          return { success: false, error: "A valid contribution amount is required" };
        }
        const itemPrice = item.price;

        return prisma.$transaction(async (tx) => {
          // Re-check freshness inside the transaction to shrink (not
          // eliminate) the race window against a concurrent full
          // reservation. A full, airtight guard would need a row lock
          // (e.g. SELECT ... FOR UPDATE); skipped here since a partial
          // pledge landing just after a full reservation is a display
          // inconsistency, not a double-booking.
          const current = await tx.item.findUnique({
            where: { id: command.itemId },
            select: { isReserved: true },
          });
          if (!current || current.isReserved) {
            return { success: false, error: "Item is already reserved" };
          }
          const pledge = await tx.pledge.create({
            data: {
              itemId: command.itemId,
              mode: "partial",
              amount,
              userId: command.userId ?? undefined,
              guestName: command.guestName,
              message: command.message,
              isAnonymous: command.isAnonymous ?? false,
            },
            select: { id: true },
          });
          const total = await tx.pledge.aggregate({
            where: { itemId: command.itemId, mode: "partial" },
            _sum: { amount: true },
          });
          const pledgedTotal = total._sum.amount ?? 0;
          if (pledgedTotal >= itemPrice) {
            await tx.item.update({
              where: { id: command.itemId },
              data: { isReserved: true },
            });
          }
          return { success: true, pledgeId: pledge.id };
        });
      }

      case "regenerate-share-token": {
        const shareToken = randomBytes(16).toString("hex");
        await prisma.wishlist.update({
          where: { userId: command.userId },
          data: { shareToken },
        });
        return { shareToken };
      }

      case "revoke-share-token": {
        await prisma.wishlist.update({
          where: { userId: command.userId },
          data: { shareToken: null },
        });
        return undefined;
      }
    }
  }
}
