import { afterAll, describe } from "vitest";

import { prisma } from "@/lib/prisma";
import { PrismaWishlistRepository } from "../prisma-adapter";
import { runRepositoryConformanceSuite, type ConformanceHarness } from "./conformance";

// Needs a live database (docker-compose.yml provides one) — gated so the
// default `npm test` stays fast. Run with:
//   docker-compose up -d && RUN_DB_TESTS=1 npm test
const runIfDbAvailable = process.env.RUN_DB_TESTS ? describe : describe.skip;

let userCounter = 0;

const TEST_USERNAME_PREFIX = "conformance-user-";

// Pattern-based, not ID-tracking: `runRepositoryConformanceSuite` calls
// `createHarness()` fresh for every single `it()`, so an ID list held in a
// harness closure would be discarded before the next test's `reset()` could
// see it, silently leaking rows into the real database on every run.
// Deleting by the username prefix instead cleans up this run's rows *and*
// any left over from a prior run that didn't get this far.
async function deleteAllTestUsers() {
  const stale = await prisma.user.findMany({
    where: { username: { startsWith: TEST_USERNAME_PREFIX } },
    select: { id: true },
  });
  if (stale.length > 0) {
    const staleIds = stale.map((u) => u.id);
    // Pledge.userId has no cascade delete, unlike everything else these
    // users own (wishlist/item/category/follows all cascade).
    await prisma.pledge.deleteMany({ where: { userId: { in: staleIds } } });
    await prisma.user.deleteMany({ where: { id: { in: staleIds } } });
  }
}

function makeHarness(): ConformanceHarness {
  const repo = new PrismaWishlistRepository();

  return {
    repo,
    reset: deleteAllTestUsers,
    async createUser(overrides = {}) {
      userCounter += 1;
      const username = overrides.username ?? `${TEST_USERNAME_PREFIX}${Date.now()}-${userCounter}`;
      const user = await prisma.user.create({
        data: {
          username,
          email: overrides.email ?? `${username}@example.com`,
          name: "Conformance Test User",
        },
      });
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
    await deleteAllTestUsers();
    await prisma.$disconnect();
  });
});
