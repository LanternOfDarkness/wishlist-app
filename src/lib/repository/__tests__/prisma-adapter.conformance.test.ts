import { afterAll, describe } from "vitest";

import { prisma } from "@/lib/prisma";
import { PrismaWishlistRepository } from "../prisma-adapter";
import { runRepositoryConformanceSuite, type ConformanceHarness } from "./conformance";

// Needs a live database (docker-compose.yml provides one) — gated so the
// default `npm test` stays fast. Run with:
//   docker-compose up -d && RUN_DB_TESTS=1 npm test
const runIfDbAvailable = process.env.RUN_DB_TESTS ? describe : describe.skip;

let userCounter = 0;

function makeHarness(): ConformanceHarness {
  const repo = new PrismaWishlistRepository();
  const createdUserIds: string[] = [];

  return {
    repo,
    async reset() {
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
        createdUserIds.length = 0;
      }
    },
    async createUser(overrides = {}) {
      userCounter += 1;
      const username = overrides.username ?? `conformance-user-${userCounter}`;
      const user = await prisma.user.create({
        data: {
          username,
          email: overrides.email ?? `${username}@example.com`,
          name: "Conformance Test User",
        },
      });
      createdUserIds.push(user.id);
      return { id: user.id, username };
    },
    async createWishlist(userId, overrides = {}) {
      const wishlist = await prisma.wishlist.create({
        data: {
          userId,
          title: "Test Wishlist",
          slug: `conformance-wishlist-${userId}`,
          isPublic: overrides.isPublic ?? true,
          shareToken: overrides.shareToken ?? null,
        },
      });
      return { id: wishlist.id };
    },
    async createItem(wishlistId, overrides = {}) {
      const item = await prisma.item.create({
        data: {
          wishlistId,
          name: overrides.name ?? "Test Item",
          price: overrides.price ?? null,
          currency: "UAH",
          priority: 3,
          isReserved: overrides.isReserved ?? false,
          isPrivate: overrides.isPrivate ?? false,
          isArchived: overrides.isArchived ?? false,
          showInWidget: overrides.showInWidget ?? false,
        },
      });
      return { id: item.id };
    },
    async createFollow(followerId, followingId) {
      await prisma.follows.create({ data: { followerId, followingId } });
    },
  };
}

runIfDbAvailable("Prisma live-database conformance", () => {
  runRepositoryConformanceSuite("PrismaWishlistRepository", makeHarness);

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
